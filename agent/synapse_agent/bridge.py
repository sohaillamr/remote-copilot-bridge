"""
Core execution engine — runs CLI tools as subprocesses with streaming output.

Ported from CopilotBridge._execute(), generalized for any tool.
Adds line-by-line streaming via an async callback for real-time output.
"""

from __future__ import annotations

import asyncio
import os
import platform
import re
import subprocess
import shutil
import tempfile
import time
from typing import Callable, Awaitable

from synapse_agent.models import ToolResult
from synapse_agent.tools import get_tool_command, find_tool_binary

# ── Output sanitization ─────────────────────────────────────

# ANSI escape codes (colours, cursor movement, etc.)
_ANSI_RE = re.compile(r'\x1b\[[0-9;]*[A-Za-z]|\x1b\][^\x07]*\x07|\x1b[()][AB012]|\x1b\[\?[0-9;]*[hl]')

# Braille spinner characters used by CLI tools (ora / yocto-spinner)
_SPINNER_CHARS = set('⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏⣾⣽⣻⢿⡿⣟⣯⣷●○◐◑◒◓◔◕')

# Lines that are purely progress / noise
_NOISE_PATTERNS = [
    re.compile(r'^\s*$'),                          # blank
    re.compile(r'^[\s⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏⣾⣽⣻⢿⡿⣟⣯⣷●○◐◑◒◓◔◕\-\\/|]+$'),  # pure spinners/dashes
    re.compile(r'^\s*(Thinking|Working|Processing|Loading|Searching|Reading|Analyzing)\s*[\.…]*\s*$', re.I),
    re.compile(r'^\s*\d+%\s*[\|█▓▒░─━]*'),        # progress bars
    re.compile(r'^\x1b'),                           # leftover escape starts
    # pwsh.exe errors (tool tried to use PowerShell Core which isn't installed)
    re.compile(r'.*(?:pwsh|powershell\s*core).*(?:not\s+found|not\s+recognized|ENOENT|cannot\s+find|is\s+not)', re.I),
    re.compile(r'^Error:\s*spawn\s+pwsh', re.I),
    re.compile(r".*'pwsh(?:\.exe)?'.*not\s+recognized", re.I),
]


def _strip_ansi(text: str) -> str:
    """Remove ANSI escape sequences from a string."""
    return _ANSI_RE.sub('', text)


def _is_noise_line(line: str) -> bool:
    """Return True if the line is spinner/progress noise that should be hidden."""
    stripped = line.strip()
    if not stripped:
        return True
    # Pure spinner characters
    if all(c in _SPINNER_CHARS or c == ' ' for c in stripped):
        return True
    for pat in _NOISE_PATTERNS:
        if pat.match(stripped):
            return True
    return False

# Dangerous shell command patterns — blocked by default
BLOCKED_COMMANDS: list[str] = [
    "format ", "del /s", "rmdir /s", "rd /s",
    "rm -rf", "rm -r", "shutdown", "restart",
    "net user", "net localgroup", "reg delete",
    "powershell -enc", "powershell -e ",
]


def _build_env() -> dict[str, str]:
    """
    Build the environment for subprocesses.

    On Windows, ensure the SHELL variable points to powershell.exe (v5.1)
    instead of pwsh.exe (v7+) which may not be installed.  Many CLI tools
    (e.g. GitHub Copilot) use SHELL to decide which shell to invoke for
    command execution.

    Also creates a `pwsh.cmd` shim if PowerShell Core is not installed,
    so that CLI tools that hard-check for `pwsh.exe` in PATH can still
    run shell commands via Windows PowerShell 5.1.
    """
    env = os.environ.copy()
    if platform.system().lower() == "windows":
        # Prefer powershell.exe (always installed), fall back to cmd.exe
        ps = shutil.which("powershell.exe") or r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"
        # Force-set SHELL — setdefault won't override a stale/wrong value
        env["SHELL"] = ps
        # Also set COMSPEC to cmd.exe as a fallback for tools that use it
        env.setdefault("COMSPEC", shutil.which("cmd.exe") or r"C:\Windows\System32\cmd.exe")

        # If pwsh.exe (PowerShell Core 7+) is not installed, create a shim
        # so that CLI tools (e.g. GitHub Copilot) that directly invoke
        # `pwsh.exe` can still work via Windows PowerShell 5.1.
        if not shutil.which("pwsh") and not shutil.which("pwsh.exe"):
            shim_dir = _ensure_pwsh_shim(ps)
            if shim_dir:
                env["PATH"] = shim_dir + os.pathsep + env.get("PATH", "")
    return env


# Cache the shim directory so we only create it once per process
_pwsh_shim_dir: str | None = None


def _ensure_pwsh_shim(powershell_path: str) -> str | None:
    """
    Create a pwsh.exe shim that IS powershell.exe, so CLI tools that
    hard-check for `pwsh.exe` (via execFile, spawn, PATH lookup) find it.

    Strategy (in order):
    1. Copy powershell.exe → pwsh.exe  (real .exe, works everywhere)
    2. Compile a tiny C# wrapper via csc.exe  (fallback)
    3. Create pwsh.cmd + pwsh.bat text shims  (last resort)
    """
    global _pwsh_shim_dir
    if _pwsh_shim_dir and os.path.isdir(_pwsh_shim_dir):
        return _pwsh_shim_dir

    try:
        shim_dir = os.path.join(tempfile.gettempdir(), "synapse-shims")
        os.makedirs(shim_dir, exist_ok=True)

        exe_path = os.path.join(shim_dir, "pwsh.exe")

        # ── Strategy 1: copy powershell.exe as pwsh.exe ───────────────
        if not os.path.isfile(exe_path):
            try:
                shutil.copy2(powershell_path, exe_path)
            except Exception:
                pass

        # ── Strategy 2: compile a real exe via .NET csc.exe ────────────
        if not os.path.isfile(exe_path):
            _compile_pwsh_exe(shim_dir, powershell_path)

        # ── Strategy 3: .cmd + .bat text shims (works with cmd /c) ───
        if not os.path.isfile(exe_path):
            for ext in ("cmd", "bat"):
                shim = os.path.join(shim_dir, f"pwsh.{ext}")
                if not os.path.isfile(shim):
                    with open(shim, "w") as f:
                        f.write(f'@"{powershell_path}" %*\n')

        _pwsh_shim_dir = shim_dir
        return shim_dir
    except Exception:
        return None


def _compile_pwsh_exe(shim_dir: str, powershell_path: str) -> bool:
    """
    Compile a real pwsh.exe wrapper using .NET Framework's csc.exe.

    Creates an actual Windows executable that transparently forwards
    all arguments to powershell.exe, inheriting stdin/stdout/stderr.
    """
    exe_path = os.path.join(shim_dir, "pwsh.exe")
    cs_path = os.path.join(shim_dir, "_pwsh.cs")

    # Locate csc.exe from .NET Framework (always present on Windows)
    csc = None
    for fw in (
        r"C:\Windows\Microsoft.NET\Framework64\v4.0.30319",
        r"C:\Windows\Microsoft.NET\Framework\v4.0.30319",
    ):
        candidate = os.path.join(fw, "csc.exe")
        if os.path.isfile(candidate):
            csc = candidate
            break

    if not csc:
        return False

    try:
        ps = powershell_path.replace('\\', '\\\\')
        source = (
            'using System;using System.Diagnostics;'
            'class P{static int Main(string[] a){'
            'try{var p=Process.Start(new ProcessStartInfo{'
            f'FileName=@"{powershell_path}",'
            'Arguments=string.Join(" ",a),'
            'UseShellExecute=false});'
            'p.WaitForExit();return p.ExitCode;}'
            'catch{return 1;}}}'
        )
        with open(cs_path, "w") as f:
            f.write(source)

        result = subprocess.run(
            [csc, "/nologo", "/optimize+", f"/out:{exe_path}", cs_path],
            capture_output=True,
            timeout=30,
        )

        try:
            os.remove(cs_path)
        except OSError:
            pass

        return result.returncode == 0 and os.path.isfile(exe_path)
    except Exception:
        return False


class ToolBridge:
    """
    Manages execution of AI CLI tools as subprocesses.

    Supports:
    - Streaming stdout/stderr line-by-line via async callback
    - Async lock (one tool at a time)
    - Cancel / kill running process
    - Timeout enforcement
    - Shell command execution with blocklist
    """

    def __init__(self, work_dir: str | None = None):
        self.work_dir: str = work_dir or os.getcwd()
        self._lock = asyncio.Lock()
        self._current_process: asyncio.subprocess.Process | None = None
        # Cache: tool_name → binary_path
        self._tool_cache: dict[str, str] = {}

    @property
    def is_busy(self) -> bool:
        return self._lock.locked()

    # ──────────────────────────────────────────────────────────────────
    # Streaming subprocess execution
    # ──────────────────────────────────────────────────────────────────

    async def _stream_execute(
        self,
        cmd: str | list[str],
        cwd: str,
        timeout: int,
        on_line: Callable[[str], Awaitable[None]] | None = None,
    ) -> ToolResult:
        """
        Execute a command with line-by-line streaming.

        Accepts either a shell command string or a list of args.
        If on_line is provided, each stdout/stderr line is sent to the
        callback as it arrives (for real-time Broadcast to the web portal).
        Full output is also accumulated in the result.
        """
        result = ToolResult()
        start = time.time()
        stdout_lines: list[str] = []
        stderr_lines: list[str] = []
        lines_streamed = 0

        try:
            if isinstance(cmd, list):
                self._current_process = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=cwd,
                    env=_build_env(),
                )
            else:
                self._current_process = await asyncio.create_subprocess_shell(
                    cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=cwd,
                    env=_build_env(),
                )

            async def read_stream(
                stream: asyncio.StreamReader,
                accumulator: list[str],
                prefix: str = "",
            ):
                nonlocal lines_streamed
                async for raw_line in stream:
                    decoded = raw_line.decode("utf-8", errors="replace").rstrip()
                    # Strip ANSI escape codes so output is clean
                    cleaned = _strip_ansi(decoded)
                    accumulator.append(cleaned)
                    if on_line and cleaned and not _is_noise_line(cleaned):
                        lines_streamed += 1
                        try:
                            await on_line(prefix + cleaned)
                        except Exception:
                            pass  # Don't let broadcast errors kill execution

            try:
                await asyncio.wait_for(
                    asyncio.gather(
                        read_stream(self._current_process.stdout, stdout_lines),
                        read_stream(self._current_process.stderr, stderr_lines, "[stderr] "),
                    ),
                    timeout=timeout,
                )
                await self._current_process.wait()
                rc = self._current_process.returncode
                result.exit_code = rc if rc is not None else -1

            except asyncio.TimeoutError:
                try:
                    self._current_process.kill()
                    await asyncio.wait_for(self._current_process.wait(), timeout=5)
                except Exception:
                    pass
                result.timed_out = True
                result.exit_code = -1

        except FileNotFoundError as e:
            stderr_lines.append(str(e))
            result.exit_code = 127

        except Exception as e:
            stderr_lines.append(f"Unexpected error: {e}")
            result.exit_code = 1

        finally:
            result.duration = time.time() - start
            result.stdout = "\n".join(stdout_lines)
            result.stderr = "\n".join(stderr_lines)
            result.lines_streamed = lines_streamed
            self._current_process = None

        return result

    # ──────────────────────────────────────────────────────────────────
    # Run an AI tool prompt
    # ──────────────────────────────────────────────────────────────────

    async def run_prompt(
        self,
        tool_name: str,
        prompt: str,
        work_dir: str | None = None,
        timeout: int = 120,
        on_line: Callable[[str], Awaitable[None]] | None = None,
        model: str | None = None,
    ) -> ToolResult:
        """
        Send a prompt to an AI CLI tool and return the result.

        Acquires an async lock so only one tool runs at a time.
        Non-blocking for status/cancel operations.
        """
        if self._lock.locked():
            return ToolResult(
                stderr="🔒 Agent is busy with another task. Cancel it first.",
                exit_code=-1,
                tool=tool_name,
            )

        async with self._lock:
            cwd = work_dir or self.work_dir

            # Get or cache binary path
            binary = self._tool_cache.get(tool_name)
            if not binary:
                binary = find_tool_binary(tool_name)
                if not binary:
                    return ToolResult(
                        stderr=f"❌ Tool '{tool_name}' not found on this machine.",
                        exit_code=127,
                        tool=tool_name,
                    )
                self._tool_cache[tool_name] = binary

            cmd = get_tool_command(tool_name, prompt, binary, model=model)
            if not cmd:
                return ToolResult(
                    stderr=f"❌ Could not build command for '{tool_name}'.",
                    exit_code=1,
                    tool=tool_name,
                )

            result = await self._stream_execute(cmd, cwd, timeout, on_line)
            result.tool = tool_name
            return result

    # ──────────────────────────────────────────────────────────────────
    # Run a raw shell command
    # ──────────────────────────────────────────────────────────────────

    async def run_shell(
        self,
        command: str,
        work_dir: str | None = None,
        timeout: int = 60,
        on_line: Callable[[str], Awaitable[None]] | None = None,
    ) -> ToolResult:
        """Run an arbitrary shell command with blocklist check."""
        # Safety: check blocklist
        cmd_lower = command.lower()
        for pattern in BLOCKED_COMMANDS:
            if pattern.lower() in cmd_lower:
                return ToolResult(
                    stderr=f"🚫 Blocked: command matches dangerous pattern '{pattern}'",
                    exit_code=-1,
                    tool="shell",
                )

        if self._lock.locked():
            return ToolResult(
                stderr="🔒 Agent is busy. Cancel the current task first.",
                exit_code=-1,
                tool="shell",
            )

        async with self._lock:
            cwd = work_dir or self.work_dir
            result = await self._stream_execute(command, cwd, timeout, on_line)
            result.tool = "shell"
            return result

    # ──────────────────────────────────────────────────────────────────
    # File operations (for /files and /read events)
    # ──────────────────────────────────────────────────────────────────

    def list_files(self, path: str | None = None, max_items: int = 100) -> dict:
        """List directory contents. Returns a serializable dict."""
        target = path or self.work_dir

        if not os.path.isdir(target):
            return {"error": f"Directory not found: {target}", "items": []}

        try:
            entries = sorted(os.listdir(target))
        except PermissionError:
            return {"error": f"Permission denied: {target}", "items": []}

        items = []
        for entry in entries[:max_items]:
            full = os.path.join(target, entry)
            is_dir = os.path.isdir(full)
            size = 0
            if not is_dir:
                try:
                    size = os.path.getsize(full)
                except OSError:
                    pass
            items.append({
                "name": entry,
                "is_dir": is_dir,
                "size": size,
            })

        return {
            "path": target,
            "total": len(entries),
            "shown": min(len(entries), max_items),
            "items": items,
        }

    def read_file(
        self,
        file_path: str,
        start_line: int = 1,
        end_line: int | None = None,
    ) -> dict:
        """Read file contents with optional line range. Returns serializable dict."""
        # Resolve relative paths
        if not os.path.isabs(file_path):
            file_path = os.path.join(self.work_dir, file_path)

        if not os.path.isfile(file_path):
            return {"error": f"File not found: {file_path}"}

        try:
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                all_lines = f.readlines()
        except PermissionError:
            return {"error": f"Permission denied: {file_path}"}
        except Exception as e:
            return {"error": f"Error reading file: {e}"}

        total = len(all_lines)
        end = end_line or total
        start = max(1, start_line)
        end = min(total, end)

        selected = all_lines[start - 1 : end]
        numbered = [f"{i:4d} │ {line.rstrip()}" for i, line in enumerate(selected, start=start)]

        return {
            "path": file_path,
            "filename": os.path.basename(file_path),
            "total_lines": total,
            "start_line": start,
            "end_line": end,
            "content": "\n".join(numbered),
        }

    # ──────────────────────────────────────────────────────────────────
    # Cancel / status
    # ──────────────────────────────────────────────────────────────────

    async def cancel(self) -> bool:
        """Kill the currently running subprocess."""
        proc = self._current_process
        if proc and proc.returncode is None:
            try:
                proc.kill()
            except ProcessLookupError:
                pass
            return True
        return False

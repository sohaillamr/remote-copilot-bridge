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
import shlex
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
    # pwsh.exe / PowerShell errors (tool tried to use pwsh which may not be installed or version-check failed)
    re.compile(r'.*(?:pwsh|powershell\s*(?:core|6\+|7)).*(?:not\s+found|not\s+recognized|not\s+available|ENOENT|cannot\s+find|is\s+not|install\s+it)', re.I),
    re.compile(r'^Error:\s*(?:spawn|Command\s+failed)', re.I),
    re.compile(r".*'pwsh(?:\.exe)?'.*not\s+recognized", re.I),
    re.compile(r'.*aka\.ms/powershell', re.I),
    re.compile(r'.*Missing\s+expression\s+after\s+unary', re.I),
    re.compile(r'.*MissingExpressionAfterOperator', re.I),
    re.compile(r'.*Unexpected\s+token.*version', re.I),
    re.compile(r'.*ParserError.*\[\]', re.I),
    re.compile(r'.*CategoryInfo.*ParserError', re.I),
    re.compile(r'^\s*~\s*$'),                      # PS error pointer line
    re.compile(r'^\s*--version\s*$'),               # bare --version echo
    re.compile(r'^\s*[×✕✗x]\s+.*(?:Get-Location|Get-ChildItem|working\s+dir)', re.I),  # Copilot shell error lines
    re.compile(r'.*FullyQualifiedErrorId', re.I),
    re.compile(r'.*ParentContainsErrorRecord', re.I),
    re.compile(r'.*At\s+line:\d+\s+char:\d+', re.I),
    # V8/Node.js out-of-memory crash noise
    re.compile(r'.*fatal.*(?:out\s+of\s+memory|allocation\s+failed|zone)', re.I),
    re.compile(r'^<---.*$'),                      # V8 OOM header marker
    re.compile(r'^FATAL\s+ERROR', re.I),
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
    "curl ", "wget ", "invoke-webrequest",
    "certutil -urlcache", "bitsadmin /transfer",
    "nc ", "ncat ", "netcat ",
    "python -c", "python3 -c", "node -e",
    "chmod 777", "chmod +s",
    # Additional dangerous patterns
    "bash -c", "sh -c", "cmd /c",
    "mkfs", "dd if=",
    "| bash", "| sh", "| python",
    "base64 -d", "base64 --decode",
    "scp ", "rsync ", "sftp ",
    "ssh ", "telnet ",
    "taskkill /f", "kill -9",
    "reg add", "regedit",
    "wmic ", "net share",
]

# Production default: shell support is restricted to a minimal allowlist.
ALLOWED_SHELL_PREFIXES: tuple[str, ...] = ("git",)
_DANGEROUS_SHELL_META_RE = re.compile(r"[|&;><`$()\n\r]")


def _is_path_within(child: str, parent: str) -> bool:
    """Check if a resolved path is within the parent directory."""
    try:
        child_resolved = os.path.realpath(os.path.abspath(child))
        parent_resolved = os.path.realpath(os.path.abspath(parent))
        return child_resolved == parent_resolved or child_resolved.startswith(
            parent_resolved + os.sep
        )
    except (ValueError, OSError):
        return False


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

    # Give Node.js-based CLI tools (Copilot, Claude, Gemini) enough heap
    # memory. Default V8 limit (~2GB) is too low for large prompts/projects
    # and causes "fatal process out of memory: zone" crashes.
    node_opts = env.get("NODE_OPTIONS", "")
    if "--max-old-space-size" not in node_opts:
        env["NODE_OPTIONS"] = f"{node_opts} --max-old-space-size=4096".strip()

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
    Create a pwsh.exe shim that fakes PowerShell 7 for CLI tools.

    CLI tools like GitHub Copilot run `pwsh.exe --version` to detect
    PowerShell Core.  A plain copy of powershell.exe fails because
    PS 5.1 doesn't understand `--version`.  Instead we compile a real
    .exe that intercepts `--version` / `--help` and delegates everything
    else to powershell.exe.

    Strategy (in order):
    1. Compile a smart wrapper via .NET csc.exe  (best: handles --version)
    2. Create pwsh.cmd + pwsh.bat text shims  (fallback for cmd /c calls)
    """
    global _pwsh_shim_dir
    if _pwsh_shim_dir and os.path.isdir(_pwsh_shim_dir):
        return _pwsh_shim_dir

    try:
        shim_dir = os.path.join(tempfile.gettempdir(), "synapse-shims")
        os.makedirs(shim_dir, exist_ok=True)

        exe_path = os.path.join(shim_dir, "pwsh.exe")

        # ── Strategy 1: compile a smart wrapper that fakes --version ──
        if not os.path.isfile(exe_path):
            _compile_pwsh_exe(shim_dir, powershell_path)

        # ── Strategy 2: .cmd + .bat text shims (last resort) ─────────
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
    Compile a smart pwsh.exe wrapper using .NET Framework's csc.exe.

    The wrapper intercepts version/help flags that PowerShell 5.1 doesn't
    understand and returns fake PowerShell 7 responses, so CLI tools
    (GitHub Copilot, Claude CLI) that check `pwsh --version` believe
    PowerShell Core is installed.  All other invocations are forwarded
    transparently to powershell.exe.
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
        # C# source: intercept --version/-v/--help, forward everything else
        source = (
            'using System;'
            'using System.Diagnostics;'
            'class PwshShim{'
            'static int Main(string[] args){'
            'if(args.Length>0){'
            'string a0=args[0].ToLowerInvariant();'
            'if(a0=="--version"||a0=="-v"||a0=="-version"){'
            'Console.WriteLine("7.4.6");return 0;}'
            'if(a0=="--help"||a0=="-h"||a0=="-help"||a0=="-?"){'
            'Console.WriteLine("PowerShell 7.4.6 (synapse-shim)");'
            'Console.WriteLine("Usage: pwsh [options]");'
            'Console.WriteLine("  -Command  Execute a command");'
            'Console.WriteLine("  -File     Execute a script file");'
            'return 0;}}'
            'try{'
            'var psi=new ProcessStartInfo{'
            f'FileName=@"{powershell_path}",'
            'UseShellExecute=false,'
            'RedirectStandardInput=false,'
            'RedirectStandardOutput=false,'
            'RedirectStandardError=false};'
            'string joined=string.Join(" ",args);'
            'if(!string.IsNullOrEmpty(joined))psi.Arguments=joined;'
            'var p=Process.Start(psi);'
            'p.WaitForExit();'
            'return p.ExitCode;'
            '}catch(Exception ex){'
            'Console.Error.WriteLine(ex.Message);'
            'return 1;}}}'
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

            # Detect Node.js OOM crash and provide a clean error message
            combined = result.stderr.lower()
            if any(s in combined for s in (
                "out of memory", "allocation failed",
                "fatal process", "zone", "heap limit",
            )) and result.exit_code != 0:
                result._oom = True
                # Replace noisy V8 crash dump with a clear message
                result.stderr = (
                    "The AI tool ran out of memory while processing your request.\n"
                    "This usually happens with very large projects or long prompts.\n"
                    "Tip: try a shorter prompt, or narrow the scope (e.g. specific files)."
                )

        return result

    # ──────────────────────────────────────────────────────────────────
    # Run an AI tool prompt
    # ──────────────────────────────────────────────────────────────────

    async def run_prompt(
        self,
        tool_name: str,
        prompt: str,
        work_dir: str | None = None,
        timeout: int = 300,
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

            # Auto-retry once with more memory if Node.js OOM detected
            if getattr(result, '_oom', False):
                # Bump heap to 6GB for the retry — use subprocess env, don't mutate global
                prev_node_opts = os.environ.get("NODE_OPTIONS", "")
                os.environ["NODE_OPTIONS"] = "--max-old-space-size=6144"
                if on_line:
                    try:
                        await on_line("⚠ Out of memory — retrying with more RAM…")
                    except Exception:
                        pass
                result = await self._stream_execute(cmd, cwd, timeout, on_line)
                result.tool = tool_name
                # Restore original NODE_OPTIONS
                if prev_node_opts:
                    os.environ["NODE_OPTIONS"] = prev_node_opts
                else:
                    os.environ.pop("NODE_OPTIONS", None)

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
        """Run a restricted shell command with blocklist and allowlist checks."""
        # Safety: check blocklist
        cmd_lower = command.lower()
        for pattern in BLOCKED_COMMANDS:
            if pattern.lower() in cmd_lower:
                return ToolResult(
                    stderr=f"🚫 Blocked: command matches dangerous pattern '{pattern}'",
                    exit_code=-1,
                    tool="shell",
                )

        # Safety: reject shell metacharacters that can chain/redirect commands.
        if _DANGEROUS_SHELL_META_RE.search(command):
            return ToolResult(
                stderr="🚫 Blocked: command contains unsafe shell metacharacters.",
                exit_code=-1,
                tool="shell",
            )

        # Safety: allowlist by command prefix.
        stripped = command.strip()
        if not stripped:
            return ToolResult(stderr="Empty shell command.", exit_code=-1, tool="shell")

        lowered = stripped.lower()
        if not any(lowered == p or lowered.startswith(p + " ") for p in ALLOWED_SHELL_PREFIXES):
            return ToolResult(
                stderr="🚫 Blocked: command not in allowlist.",
                exit_code=-1,
                tool="shell",
            )

        # Parse to argv and execute without shell interpolation.
        try:
            argv = shlex.split(stripped, posix=(platform.system().lower() != "windows"))
        except ValueError as exc:
            return ToolResult(stderr=f"Invalid command syntax: {exc}", exit_code=-1, tool="shell")

        if not argv:
            return ToolResult(stderr="Empty shell command.", exit_code=-1, tool="shell")

        if self._lock.locked():
            return ToolResult(
                stderr="🔒 Agent is busy. Cancel the current task first.",
                exit_code=-1,
                tool="shell",
            )

        async with self._lock:
            cwd = work_dir or self.work_dir
            result = await self._stream_execute(argv, cwd, timeout, on_line)
            result.tool = "shell"
            return result

    # ──────────────────────────────────────────────────────────────────
    # File operations (for /files and /read events)
    # ──────────────────────────────────────────────────────────────────

    def list_files(self, path: str | None = None, max_items: int = 100) -> dict:
        """List directory contents. Returns a serializable dict."""
        target = path or self.work_dir

        # Path confinement: reject paths outside work_dir
        if not _is_path_within(target, self.work_dir):
            return {"error": f"Access denied: path is outside the workspace.", "items": []}

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

    # Maximum file size for read operations (10 MB)
    MAX_READ_SIZE = 10 * 1024 * 1024  # 10 MB
    MAX_PROMPT_LENGTH = 16_000  # 16 KB max prompt text

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

        # Path confinement: reject paths outside work_dir
        if not _is_path_within(file_path, self.work_dir):
            return {"error": "Access denied: path is outside the workspace."}

        if not os.path.isfile(file_path):
            return {"error": f"File not found: {file_path}"}

        # Reject files larger than 10 MB
        try:
            fsize = os.path.getsize(file_path)
            if fsize > self.MAX_READ_SIZE:
                return {"error": f"File too large ({fsize / 1048576:.1f} MB). Max is 10 MB."}
        except OSError:
            pass

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



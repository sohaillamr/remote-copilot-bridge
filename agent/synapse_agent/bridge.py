"""
Core execution engine — runs CLI tools as subprocesses with streaming output.

Ported from CopilotBridge._execute(), generalized for any tool.
Adds line-by-line streaming via an async callback for real-time output.
"""

from __future__ import annotations

import asyncio
import os
import subprocess
import time
from typing import Callable, Awaitable

from synapse_agent.models import ToolResult
from synapse_agent.tools import get_tool_command, find_tool_binary

# Dangerous shell command patterns — blocked by default
BLOCKED_COMMANDS: list[str] = [
    "format ", "del /s", "rmdir /s", "rd /s",
    "rm -rf", "rm -r", "shutdown", "restart",
    "net user", "net localgroup", "reg delete",
    "powershell -enc", "powershell -e ",
]


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
        cmd_str: str,
        cwd: str,
        timeout: int,
        on_line: Callable[[str], Awaitable[None]] | None = None,
    ) -> ToolResult:
        """
        Execute a command with line-by-line streaming.

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
            self._current_process = await asyncio.create_subprocess_shell(
                cmd_str,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=cwd,
            )

            async def read_stream(
                stream: asyncio.StreamReader,
                accumulator: list[str],
                prefix: str = "",
            ):
                nonlocal lines_streamed
                async for raw_line in stream:
                    decoded = raw_line.decode("utf-8", errors="replace").rstrip()
                    accumulator.append(decoded)
                    if on_line and decoded:
                        lines_streamed += 1
                        try:
                            await on_line(prefix + decoded)
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

            cmd_str = get_tool_command(tool_name, prompt, binary)
            if not cmd_str:
                return ToolResult(
                    stderr=f"❌ Could not build command for '{tool_name}'.",
                    exit_code=1,
                    tool=tool_name,
                )

            result = await self._stream_execute(cmd_str, cwd, timeout, on_line)
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

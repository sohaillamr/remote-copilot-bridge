"""Result dataclass for CLI tool execution — tool-agnostic."""

from __future__ import annotations

import json
from dataclasses import dataclass, field


@dataclass
class ToolResult:
    """
    Result from any CLI tool invocation.

    Ported from CopilotResult in the original bridge, generalized
    for any tool (copilot, claude, gemini, codex, aider, shell).
    """

    stdout: str = ""
    stderr: str = ""
    exit_code: int = -1
    duration: float = 0.0
    timed_out: bool = False
    tool: str = ""
    lines_streamed: int = 0

    @property
    def success(self) -> bool:
        return self.exit_code == 0 and not self.timed_out

    @property
    def full_output(self) -> str:
        """Return combined stdout + stderr."""
        parts: list[str] = []
        if self.stdout.strip():
            parts.append(self.stdout.strip())
        if self.stderr.strip():
            parts.append(self.stderr.strip())
        return "\n".join(parts)

    def summary_line(self) -> str:
        """One-line status string."""
        if self.timed_out:
            return f"⏰ Timed out after {self.duration:.0f}s"
        icon = "✅" if self.success else "⚠️"
        return f"{icon} {self.duration:.1f}s | Exit: {self.exit_code}"

    def to_dict(self) -> dict:
        """Serialize for Supabase Broadcast / JSON storage."""
        return {
            "stdout": self.stdout,
            "stderr": self.stderr,
            "exit_code": self.exit_code,
            "duration": round(self.duration, 2),
            "timed_out": self.timed_out,
            "tool": self.tool,
            "success": self.success,
            "lines_streamed": self.lines_streamed,
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict())

    @classmethod
    def from_dict(cls, data: dict) -> ToolResult:
        return cls(
            stdout=data.get("stdout", ""),
            stderr=data.get("stderr", ""),
            exit_code=data.get("exit_code", -1),
            duration=data.get("duration", 0.0),
            timed_out=data.get("timed_out", False),
            tool=data.get("tool", ""),
            lines_streamed=data.get("lines_streamed", 0),
        )

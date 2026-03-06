"""
Cross-platform AI CLI tool discovery.

Detects installed AI CLI tools and their binary paths on
Windows, macOS, and Linux.
"""

from __future__ import annotations

import os
import platform
import shutil
from dataclasses import dataclass


@dataclass
class ToolInfo:
    """Metadata about a detected CLI tool."""

    name: str
    binary_path: str
    version: str | None = None
    command_template: str = ""  # e.g. '{binary} -p "{prompt}"'

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "binary_path": self.binary_path,
            "version": self.version,
            "command_template": self.command_template,
        }


# ──────────────────────────────────────────────────────────────────────────
# Known tool definitions: name → (search paths by OS, command template)
# ──────────────────────────────────────────────────────────────────────────

_SYSTEM = platform.system().lower()  # 'windows', 'darwin', 'linux'

_APPDATA = os.environ.get("APPDATA", "")
_HOME = os.path.expanduser("~")
_LOCAL_BIN = os.path.join(_HOME, ".local", "bin")
_NPM_GLOBAL = os.path.join(_HOME, ".npm-global", "bin")


TOOL_REGISTRY: dict[str, dict] = {
    "copilot": {
        "display_name": "GitHub Copilot",
        "binary_names": ["copilot", "copilot.cmd", "copilot.exe", "copilot.bat"],
        "known_paths": {
            "windows": [
                os.path.join(_APPDATA, "npm", "copilot.cmd"),
                os.path.join(
                    _APPDATA, "Code", "User", "globalStorage",
                    "github.copilot-chat", "copilotCli", "copilot.bat",
                ),
            ],
            "darwin": [
                os.path.join(_NPM_GLOBAL, "copilot"),
                "/usr/local/bin/copilot",
                os.path.join(_HOME, ".nvm/versions/node/*/bin/copilot"),
            ],
            "linux": [
                os.path.join(_NPM_GLOBAL, "copilot"),
                "/usr/local/bin/copilot",
                os.path.join(_LOCAL_BIN, "copilot"),
            ],
        },
        "command_template": '{binary} -p "{prompt}" --allow-all',
        "install_hint": "npm install -g @github/copilot",
    },
    "claude": {
        "display_name": "Claude CLI",
        "binary_names": ["claude", "claude.exe"],
        "known_paths": {
            "windows": [
                os.path.join(_APPDATA, "npm", "claude.cmd"),
            ],
            "darwin": [
                os.path.join(_NPM_GLOBAL, "claude"),
                "/usr/local/bin/claude",
            ],
            "linux": [
                os.path.join(_NPM_GLOBAL, "claude"),
                os.path.join(_LOCAL_BIN, "claude"),
            ],
        },
        "command_template": '{binary} -p "{prompt}" --allowedTools "all"',
        "install_hint": "npm install -g @anthropic-ai/claude-cli",
    },
    "gemini": {
        "display_name": "Google Gemini CLI",
        "binary_names": ["gemini", "gemini.exe"],
        "known_paths": {
            "windows": [
                os.path.join(_APPDATA, "npm", "gemini.cmd"),
            ],
            "darwin": [
                os.path.join(_NPM_GLOBAL, "gemini"),
                "/usr/local/bin/gemini",
            ],
            "linux": [
                os.path.join(_NPM_GLOBAL, "gemini"),
                os.path.join(_LOCAL_BIN, "gemini"),
            ],
        },
        "command_template": '{binary} -p "{prompt}"',
        "install_hint": "npm install -g @anthropic-ai/gemini-cli",
    },
    "codex": {
        "display_name": "OpenAI Codex CLI",
        "binary_names": ["codex", "codex.exe"],
        "known_paths": {
            "windows": [
                os.path.join(_APPDATA, "npm", "codex.cmd"),
            ],
            "darwin": [
                os.path.join(_NPM_GLOBAL, "codex"),
                "/usr/local/bin/codex",
            ],
            "linux": [
                os.path.join(_NPM_GLOBAL, "codex"),
                os.path.join(_LOCAL_BIN, "codex"),
            ],
        },
        "command_template": '{binary} -q "{prompt}"',
        "install_hint": "npm install -g @openai/codex",
    },
    "aider": {
        "display_name": "Aider",
        "binary_names": ["aider", "aider.exe"],
        "known_paths": {
            "windows": [
                os.path.join(_HOME, "AppData", "Local", "Programs", "Python", "**", "Scripts", "aider.exe"),
            ],
            "darwin": [
                os.path.join(_LOCAL_BIN, "aider"),
                "/usr/local/bin/aider",
            ],
            "linux": [
                os.path.join(_LOCAL_BIN, "aider"),
            ],
        },
        "command_template": '{binary} --message "{prompt}" --yes',
        "install_hint": "pip install aider-chat",
    },
}


def find_tool_binary(tool_name: str) -> str | None:
    """
    Locate a tool's binary. Checks known paths first, then falls back to PATH.

    Returns the absolute path to the binary, or None if not found.
    """
    tool = TOOL_REGISTRY.get(tool_name)
    if not tool:
        # Unknown tool — try PATH lookup directly
        return shutil.which(tool_name)

    # 1. Check known platform-specific paths
    known = tool.get("known_paths", {}).get(_SYSTEM, [])
    for path in known:
        if "*" in path:
            # Glob pattern — skip for now, rely on PATH
            continue
        if os.path.isfile(path):
            return os.path.abspath(path)

    # 2. Fall back to PATH search
    for name in tool.get("binary_names", [tool_name]):
        found = shutil.which(name)
        if found:
            return os.path.abspath(found)

    return None


def discover_all_tools() -> list[ToolInfo]:
    """
    Scan for all known AI CLI tools on this machine.

    Returns a list of ToolInfo for each detected tool.
    """
    found: list[ToolInfo] = []

    for name, meta in TOOL_REGISTRY.items():
        binary = find_tool_binary(name)
        if binary:
            found.append(
                ToolInfo(
                    name=name,
                    binary_path=binary,
                    command_template=meta.get("command_template", '{binary} "{prompt}"'),
                )
            )

    return found


def get_tool_command(tool_name: str, prompt: str, binary_path: str | None = None) -> str | None:
    """
    Build the shell command for a given tool and prompt.

    Returns the command string ready for subprocess, or None if tool not found.
    """
    tool = TOOL_REGISTRY.get(tool_name)
    if not tool:
        return None

    binary = binary_path or find_tool_binary(tool_name)
    if not binary:
        return None

    template = tool.get("command_template", '{binary} "{prompt}"')
    return template.format(binary=binary, prompt=prompt.replace('"', '\\"'))

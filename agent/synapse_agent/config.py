"""
Local configuration management for the Synapse Agent.

Stores auth tokens, agent ID, and settings in ~/.synapse/config.yaml.
"""

from __future__ import annotations

import os
import stat
import sys
from pathlib import Path
from typing import Any

import yaml


CONFIG_DIR = Path.home() / ".synapse"
CONFIG_FILE = CONFIG_DIR / "config.yaml"

# Defaults
DEFAULT_CONFIG: dict[str, Any] = {
    "supabase_url": "",
    "supabase_anon_key": "",
    "access_token": "",
    "refresh_token": "",
    "agent_id": "",
    "agent_name": "",
    "work_dir": os.getcwd(),
    "default_tool": "copilot",
    "default_timeout": 120,
    "blocked_commands_enabled": True,
}


def ensure_config_dir() -> Path:
    """Create ~/.synapse/ if it doesn't exist."""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    return CONFIG_DIR


def load_config() -> dict[str, Any]:
    """Load config from ~/.synapse/config.yaml. Returns defaults if missing."""
    if not CONFIG_FILE.exists():
        return dict(DEFAULT_CONFIG)

    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
    except Exception:
        return dict(DEFAULT_CONFIG)

    # Merge with defaults so new keys are always present
    merged = dict(DEFAULT_CONFIG)
    merged.update(data)
    return merged


def save_config(config: dict[str, Any]) -> None:
    """Save config to ~/.synapse/config.yaml with restricted permissions."""
    ensure_config_dir()

    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        yaml.dump(config, f, default_flow_style=False, sort_keys=False)

    # Restrict file permissions on Unix (owner-only read/write)
    if sys.platform != "win32":
        os.chmod(CONFIG_FILE, stat.S_IRUSR | stat.S_IWUSR)  # 0o600


def get_value(key: str, default: Any = None) -> Any:
    """Get a single config value."""
    config = load_config()
    return config.get(key, default)


def set_value(key: str, value: Any) -> None:
    """Set a single config value and save."""
    config = load_config()
    config[key] = value
    save_config(config)


def clear_auth() -> None:
    """Clear authentication tokens (for logout)."""
    config = load_config()
    config["access_token"] = ""
    config["refresh_token"] = ""
    config["agent_id"] = ""
    save_config(config)


def is_authenticated() -> bool:
    """Check if we have stored auth tokens."""
    config = load_config()
    return bool(config.get("access_token")) and bool(config.get("supabase_url"))


def get_supabase_config() -> tuple[str, str]:
    """Return (supabase_url, supabase_anon_key) or raise if not configured."""
    config = load_config()
    url = config.get("supabase_url", "")
    key = config.get("supabase_anon_key", "")
    if not url or not key:
        raise ValueError(
            "Supabase not configured. Run 'synapse login' first."
        )
    return url, key

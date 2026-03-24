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
import keyring
import logging


# â”€â”€ Synapse cloud config (public, safe to embed) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

# Allow environment variable overrides for Supabase credentials
SYNAPSE_SUPABASE_URL = os.environ.get("SYNAPSE_SUPABASE_URL", "https://htigtkfuxyzsnotrjcyz.supabase.co")
SYNAPSE_SUPABASE_ANON_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0aWd0a2Z1eHl6c25vdHJqY3l6"
    "Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MjIwNTYsImV4cCI6MjA4ODI5"
    "ODA1Nn0.3HeYCtFpu1YmtuhPXWA9pHcVdv_Nh0ex2f5jy_3LVLw"
)

CONFIG_DIR = Path.home() / ".synapse"
CONFIG_FILE = CONFIG_DIR / "config.yaml"

# Defaults
DEFAULT_CONFIG: dict[str, Any] = {
    "access_token": "",
    "refresh_token": "",
    "user_email": "",
    "agent_id": "",
    "agent_name": "",
    "work_dir": os.getcwd(),
    "default_tool": "copilot",
    "default_timeout": 300,
    "blocked_commands_enabled": True,
    "shell_enabled": False,
}


def ensure_config_dir() -> Path:
    """Create ~/.synapse/ if it doesn't exist."""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    return CONFIG_DIR


def load_config() -> dict[str, Any]:
    """Load config from ~/.synapse/config.yaml. Returns defaults if missing."""
    merged = dict(DEFAULT_CONFIG)
    
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f) or {}
                merged.update(data)
        except Exception:
            pass

    # Try to load tokens from secure keyring vault
    try:
        kr_access = keyring.get_password("synapse_agent", "access_token")
        kr_refresh = keyring.get_password("synapse_agent", "refresh_token")
        if kr_access:
            merged["access_token"] = kr_access
        if kr_refresh:
            merged["refresh_token"] = kr_refresh
    except Exception as e:
        logging.debug(f"Keyring read skipped: {e}")

    return merged



def save_config(config: dict[str, Any]) -> None:
    """Save config to ~/.synapse/config.yaml with restricted permissions."""
    ensure_config_dir()
    
    # Store sensitive tokens in OS vault (keyring)
    disk_config = dict(config)
    
    try:
        # Save to keyring
        acc = config.get("access_token", "")
        ref = config.get("refresh_token", "")
        if acc:
            keyring.set_password("synapse_agent", "access_token", acc)
        else:
            try: keyring.delete_password("synapse_agent", "access_token")
            except: pass
            
        if ref:
            keyring.set_password("synapse_agent", "refresh_token", ref)
        else:
            try: keyring.delete_password("synapse_agent", "refresh_token")
            except: pass
            
        # Remove from plain text yaml if vault succeeded
        disk_config["access_token"] = ""
        disk_config["refresh_token"] = ""
    except Exception as e:
        logging.debug(f"Vault storage skipped ({e}), falling back to disk auth storage.")

    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        yaml.dump(disk_config, f, default_flow_style=False, sort_keys=False)

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
    config["user_email"] = ""
    config["agent_id"] = ""
    save_config(config)


def is_authenticated() -> bool:
    """Check if we have stored auth tokens."""
    config = load_config()
    return bool(config.get("access_token"))


def get_supabase_config() -> tuple[str, str]:
    """Return (supabase_url, supabase_anon_key)."""
    url = os.environ.get("SYNAPSE_SUPABASE_URL", SYNAPSE_SUPABASE_URL)
    key = os.environ.get("SYNAPSE_SUPABASE_ANON_KEY", SYNAPSE_SUPABASE_ANON_KEY)
    return url, key


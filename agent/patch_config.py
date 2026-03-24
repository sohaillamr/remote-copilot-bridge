import re

path = "synapse_agent/config.py"
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

# Add import keyring
if "import yaml" in text and "import keyring" not in text:
    text = text.replace("import yaml", "import yaml\nimport keyring\nimport logging")

# Modify load_config
load_config_new = """def load_config() -> dict[str, Any]:
    \"\"\"Load config from ~/.synapse/config.yaml. Returns defaults if missing.\"\"\"
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
"""

# Modify save_config
save_config_new = """def save_config(config: dict[str, Any]) -> None:
    \"\"\"Save config to ~/.synapse/config.yaml with restricted permissions.\"\"\"
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
"""

# Apply regex replacements
import ast
# We need to replace the entire def load_config and def save_config blocks.
pattern_load = re.compile(r"def load_config\(\) -> dict\[str, Any\]:.*?return merged\n", re.DOTALL)
pattern_save = re.compile(r"def save_config\(config: dict\[str, Any\]\) -> None:.*?os\.chmod\(CONFIG_FILE, stat\.S_IRUSR \| stat\.S_IWUSR\)  # 0o600\n", re.DOTALL)

text = pattern_load.sub(load_config_new + "\n", text)
text = pattern_save.sub(save_config_new + "\n", text)

with open(path, "w", encoding="utf-8") as f:
    f.write(text)

print("Updated config.py to use keyring")

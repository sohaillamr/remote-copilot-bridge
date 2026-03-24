import os

tools_path = r'synapse_agent\tools.py'
with open(tools_path, 'r', encoding='utf-8') as f:
    text = f.read()

old_block = """    if tool_name == "copilot":
        args = [binary, "-p", prompt, "--allow-all"]"""

new_block = """    if tool_name == "copilot":
        system_rules = "\\n\\n[System directive: If you need to run terminal commands to gather information, immediately write and execute a single combined command using run_powershell. DO NOT leave background shells open or use read_powershell as they will time out.]"
        augmented_prompt = prompt + system_rules
        args = [binary, "-p", augmented_prompt, "--allow-all"]"""

if old_block in text:
    text = text.replace(old_block, new_block)
    with open(tools_path, 'w', encoding='utf-8') as f:
        f.write(text)
    print("Injected system prompt logic into tools.py")
else:
    print("Could not find block. Manual inspect:")
    print([line for line in text.splitlines() if 'tool_name == "copilot"' in line])

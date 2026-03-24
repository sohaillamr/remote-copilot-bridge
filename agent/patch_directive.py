import os
import re

tools_path = r'agent\synapse_agent\tools.py'
with open(tools_path, 'r', encoding='utf-8') as f:
    text = f.read()

system_directive = r"""
    # Build args list directly \u2014 avoids shell injection
    if tool_name == "copilot":
        system_rules = "\n\n[System directive: If you need to run terminal commands to gather information (like counting lines, grepping, or listing files), write and execute a single continuous script or command immediately using the run_powershell/run_terminal tool and return the result. DO NOT use background shell sessions or read_powershell tools, as they will drop memory state and time out.]"
        augmented_prompt = prompt + system_rules
        args = [binary, "-p", augmented_prompt, "--allow-all"]"""

# Replace the copilot args building
old_block = r"""    # Build args list directly — avoids shell injection
    if tool_name == "copilot":
        args = [binary, "-p", prompt, "--allow-all"]"""

text = text.replace(old_block, system_directive)

# some setups might not have the em-dash because of encoding, try a simpler regex
if 'augmented_prompt' not in text:
    old_block_2 = """    if tool_name == "copilot":
        args = [binary, "-p", prompt, "--allow-all"]"""
    text = text.replace(old_block_2, """    if tool_name == "copilot":
        system_rules = "\\n\\n[System directive: If you need to run terminal commands to gather information (like counting lines, grepping, or listing files), write and execute a single continuous script or command immediately using the run_powershell/run_terminal tool and return the result. DO NOT use background shell sessions or read_powershell tools, as they will drop memory state and time out.]"
        augmented_prompt = prompt + system_rules
        args = [binary, "-p", augmented_prompt, "--allow-all"]""")

with open(tools_path, 'w', encoding='utf-8') as f:
    f.write(text)

print("prompt augmentation injected into tools.py")

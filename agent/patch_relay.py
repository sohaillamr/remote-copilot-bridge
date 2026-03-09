"""Patch relay.py to add model support."""
import re

path = r"C:\Users\dell\Desktop\synapse\agent\synapse_agent\relay.py"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add COPILOT_MODELS import
content = content.replace(
    "from synapse_agent.tools import discover_all_tools",
    "from synapse_agent.tools import discover_all_tools, COPILOT_MODELS",
)

# 2. Extract model from prompt payload
content = content.replace(
    "        if not prompt:\n            return\n\n        console.print(",
    '        model = data.get("model")\n\n        if not prompt:\n            return\n\n        model_info = f" [{model}]" if model else ""\n        console.print(',
)

# 3. Update the Prompt log line to include model
content = content.replace(
    'f"\\n[bold cyan]Prompt ({tool}):[/bold cyan] {prompt[:100]}..."',
    'f"\\n[bold cyan]Prompt ({tool}{model_info}):[/bold cyan] {prompt[:100]}..."',
)

# 4. Pass model to bridge.run_prompt
content = content.replace(
    "            timeout=timeout,\n            on_line=on_line,\n        )\n\n        # Send final result event",
    "            timeout=timeout,\n            on_line=on_line,\n            model=model,\n        )\n\n        # Send final result event",
)

# 5. Add model_choices to pong response
content = content.replace(
    '                    "tools": [t.to_dict() for t in tools],\n                    "timestamp": time.time(),',
    '                    "tools": [t.to_dict() for t in tools],\n                    "model_choices": COPILOT_MODELS,\n                    "timestamp": time.time(),',
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("relay.py patched successfully")

import re
with open("pyproject.toml", "r") as f:
    text = f.read()

text = text.replace('"requests>=2.20",', '"requests>=2.20",\n    "keyring>=24.0",')

with open("pyproject.toml", "w") as f:
    f.write(text)
print("Updated pyproject.toml")

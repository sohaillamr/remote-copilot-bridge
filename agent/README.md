# Synapse Agent — Connect your AI CLI tools to the web

[![PyPI](https://img.shields.io/pypi/v/synapse-agent)](https://pypi.org/project/synapse-agent/)
[![Python](https://img.shields.io/pypi/pyversions/synapse-agent)](https://pypi.org/project/synapse-agent/)

The Synapse Agent runs on your machine and bridges your local AI CLI tools
(Copilot, Claude, Gemini, Codex, Aider) to the Synapse web portal.

## Install

```bash
pip install synapse-agent
```

## Usage

```bash
synapse login          # Authenticate (opens browser)
synapse start          # Start listening for prompts
synapse status         # Check connection & tools
synapse tools          # List detected AI CLI tools
synapse logout         # Clear credentials
```

## Supported Tools

| Tool         | CLI Command     | Auto-detected |
|--------------|-----------------|---------------|
| GitHub Copilot | `copilot`     | ✅            |
| Claude       | `claude`        | ✅            |
| Google Gemini | `gemini`       | ✅            |
| OpenAI Codex | `codex`         | ✅            |
| Aider        | `aider`         | ✅            |
| Custom       | User-defined    | Via config    |

## Configuration

Config is stored in `~/.synapse/config.yaml` after login.

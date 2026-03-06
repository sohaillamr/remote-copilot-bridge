# Synapse — Universal AI CLI Bridge

> Access any AI CLI tool from anywhere. Your machine, your tools, your rules.

Synapse connects your local AI CLI tools (GitHub Copilot, Claude, Gemini, Codex, Aider…) to a web portal you can access from any device. The AI runs on **your machine** — Synapse just bridges the gap.

## Architecture

```
📱 Browser (synapse.dev)              💻 Your Machine
┌──────────────────┐                  ┌───────────────────┐
│  Web Portal      │  ◄── Supabase ──►  │  synapse-agent    │
│  (React SPA)     │     Realtime     │  (Python daemon)   │
│                  │     Broadcast    │                    │
│  Chat UI         │                  │  copilot · claude  │
│  File Browser    │                  │  gemini · codex    │
│  Agent Monitor   │                  │  aider · custom    │
└──────────────────┘                  └───────────────────┘
```

## Project Structure

```
synapse/
├── agent/           # Python agent (pip install synapse-agent)
├── web/             # React + Vite frontend (Cloudflare Pages)
├── supabase/        # Database migrations + Edge Functions
└── docs/            # Documentation
```

## Quick Start (User)

```bash
pip install synapse-agent
synapse login
synapse start
```

Then open [synapse.dev](https://synapse.dev) and start prompting.

## Tech Stack

| Layer       | Technology                    | Cost   |
|-------------|-------------------------------|--------|
| Backend     | Supabase (Auth/DB/Realtime)   | $0     |
| Frontend    | React + Vite + Cloudflare Pages | $0   |
| Agent       | Python (PyPI)                 | $0     |
| Payments    | Lemon Squeezy + Paymob        | % only |
| Monitoring  | Sentry + UptimeRobot + LogSnag | $0    |

## License

MIT

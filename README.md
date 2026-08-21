# Freeport

**A freemium CLI coding agent with local payment support.** Fork of [Freebuff](https://freebuff.com) (Apache-2.0), repositioned for developers in regions without international payment access.

## What is Freeport?

Freeport gives you a full-mode AI coding agent in your terminal, with a generous free tier funded by per-request ads. When you're ready for more, upgrade with local payment rails — no international card required.

- **Free tier**: 6 sessions/day, all models, ad-sponsored
- **Paid tier**: 200+ sessions/day, ad-free, via Paddle (Visa/Mastercard, PayPal, Apple Pay)

## Architecture

```
mycli/
├── cli/          # TUI client (React, OpenTUI)
├── sdk/          # JS/TS SDK
├── common/       # Shared types, tools, schemas
├── server/       # Backend (Hono + Bun + SQLite)
└── agents/       # Agent definitions
```

## Server (Phase 2 + 3)

The backend handles auth, session management, ad serving, usage tracking, and payments.

### Quick start

```bash
cd server
bun install
cp .env.example .env   # fill in your values
bun run dev             # starts on :8787
```

### Endpoints

| Route | Purpose |
|---|---|
| `POST /api/auth/cli/code` | Device-code login flow |
| `GET /api/auth/cli/status` | Poll for login approval |
| `GET/POST/DELETE /api/v1/freebuff/session` | Session admission + daily quota |
| `POST /api/v1/ads` | Sponsor line per request |
| `POST /api/v1/usage/report` | CLI reports real token usage |
| `GET /api/v1/subscription` | Check paid/free status |
| `POST /api/v1/subscription/checkout` | Create Paddle checkout URL |
| `POST /api/paddle/webhook` | Paddle event handler |
| `GET /pricing` | 3-tier pricing page |
| `GET /admin` | Admin dashboard |

### Config

All env-driven. See `.env.example` for full list. Key vars:

- `PADDLE_API_KEY` — Paddle sandbox/production API key
- `PADDLE_WEBHOOK_SECRET` — Webhook HMAC secret
- `PADDLE_CLIENT_TOKEN` — Client-side token for pricing page
- `PADDLE_ENV` — `sandbox` or `production`
- `MYCLI_FREE_SESSIONS_PER_DAY` — Free tier limit (default: 6)
- `MYCLI_PAID_SESSIONS_PER_DAY` — Paid tier limit (default: 200)

## CLI wiring

Point the CLI at your server:

```bash
NEXT_PUBLIC_CODEBUFF_APP_URL=http://localhost:8787 bun start-cli
```

Model traffic goes directly to DeepInfra. The backend handles auth, sessions, ads, and usage logging.

## Models

Routed through DeepInfra (direct, not through the backend):

| Model | Access |
|---|---|
| DeepSeek V4 Flash | Default, full access |
| MiMo 2.5 | Fallback, unlimited |
| DeepSeek V4 Pro | Full access |
| MiniMax M3 | Full access |

## Unit economics

| Session size | Tokens (in/out) | Cost |
|---|---|---|
| Small | 10K / 1K | $0.0012 |
| Medium | 50K / 3K | $0.0056 |
| Large | 150K / 8K | $0.0166 |

Ad revenue target: ~$0.03/request (needs validation — Phase 4).

## Tech stack

- **Runtime**: Bun
- **Server**: Hono
- **Database**: SQLite via `bun:sqlite`
- **Payments**: Paddle (Merchant of Record)
- **CLI**: React + OpenTUI
- **Models**: DeepInfra (DeepSeek, MiMo, MiniMax)

## License

Apache-2.0 (forked from [CodebuffAI/freebuff](https://github.com/CodebuffAI/freebuff))

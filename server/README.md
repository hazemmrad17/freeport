# @freeport/server — Phase 2 backend

The product behind the CLI: auth, session/rate-limit admission, ad serving,
and usage/cost logging for the freemium model.

Stack: Hono on Bun, SQLite via `bun:sqlite`. No external services required.

## Run

```bash
bun install
cd server
bun run dev        # hot reload on :8787
```

Config is env-driven (defaults in `src/config.ts`):

| Env | Default | Purpose |
|---|---|---|
| `FREEPORT_PORT` | `8787` | HTTP port |
| `FREEPORT_DB_PATH` | `server/data/freeport.db` | SQLite file |
| `FREEPORT_APP_URL` | `http://localhost:8787` | Public origin (login URL shown by the CLI) |
| `FREEPORT_FREE_SESSIONS_PER_DAY` | `6` | Free sessions/user/day |
| `FREEPORT_SESSION_DURATION_MINUTES` | `60` | Admitted session length |
| `FREEPORT_SESSION_RESET_OFFSET_HOURS_UTC` | `-7` | Daily reset boundary (Pacific) |
| `FREEPORT_ADMIN_TOKEN` | `admin` | Admin dashboard token |
| `FREEPORT_AD_INVENTORY` | built-in defaults | JSON sponsor inventory |
| `FREEPORT_PRICE_INPUT_USD_PER_MT` | `0.10` | DeepInfra input price |
| `FREEPORT_PRICE_OUTPUT_USD_PER_MT` | `0.20` | DeepInfra output price |
| `FREEPORT_AD_REVENUE_PER_IMPRESSION_USD` | `0.001` | Assumed rev/impression (Phase 4 replaces this) |

## Wire the CLI to it

The CLI talks to the backend through `NEXT_PUBLIC_CODEBUFF_APP_URL` (login,
session, ads, usage, logs) while model traffic goes straight to DeepInfra:

```bash
NEXT_PUBLIC_CODEBUFF_APP_URL=http://localhost:8787 bun start-cli
```

Login flow: CLI prints a device code + URL → open it, enter email → CLI polls
and receives its token. Sessions are admitted against a per-user daily quota;
each admitted session costs one unit. The CLI reports real token usage to
`/api/v1/usage/report`, which the admin dashboard turns into cost-per-user.

## Endpoints

- **Auth** — `POST /api/auth/cli/code`, `GET /api/auth/cli/status`,
  `POST /api/auth/cli/logout`, `GET /api/v1/me`, `GET|POST /login`
- **Session** — `GET|POST|DELETE /api/v1/FREEPORT/session`
  (wire-compatible with the CLI's session contract; daily `rate_limited`,
  `model_locked`, `superseded` responses)
- **Ads** — `POST /api/v1/ads`, `/api/v1/ads/impression`, `/api/v1/ads/click`
  (single sponsor line per request from `FREEPORT_AD_INVENTORY`)
- **Usage** — `POST /api/v1/usage/report` (CLI → server), `POST /api/v1/usage`
- **Logs** — `POST /api/logs` (CLI batched shipping)
- **Admin** — `GET /admin?token=...` (dashboard), `GET /api/v1/admin/stats`

## Data

`users`, `api_tokens`, `login_attempts`, `sessions`, `session_usage`,
`usage_events`, `ad_events`, `log_records`. Schema is created on first run.

## Test

```bash
cd server
bun test        # in-process smoke test: full login → session → ad → usage → admin flow
```

## Status

Phase 2 scaffolding, complete and tested end-to-end. Ad revenue per impression
is an assumption — replace it with real advertiser rates (Phase 4) before
trusting the admin dashboard's net number.
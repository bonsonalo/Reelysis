# Reelysis — Setup, Environment & Deployment

> The names below are what `backend/app/core/config.py` actually reads. Ready-to-copy templates are committed as `backend/.env.example` and `frontend/.env.example`.

---

## 1. Prerequisites

| Tool | Version | Why |
|---|---|---|
| Python | 3.12 (`backend/runtime.txt` → 3.12.3) | FastAPI + Celery |
| Node.js | 20+ (CI uses 22) | Next.js 16 |
| pnpm | 11 (`frontend/pnpm-lock.yaml` is the only lockfile) | frontend packages |
| PostgreSQL | 14+ (or a Supabase project) | main DB |
| Redis | 6+ | Celery broker, caches, rate limits, OAuth state, Gemini budget |
| Docker | optional | easiest way to run Postgres/Redis locally and for tests |

External accounts (needed only for "real mode"):
- **Meta developer app** with *Instagram API with Instagram Login* (Business/Creator accounts only).
- **Google AI Studio** key (Gemini).
- **AssemblyAI** key (transcription).
- **Bright Data** key with the Instagram Scraper datasets enabled.
- **SMTP provider** (Resend, SendGrid, Mailgun, Gmail app password…) for password-reset and verification emails in production.

`AI_SIMULATION_MODE=true` mocks Gemini, AssemblyAI and Bright Data. You still need a real Meta app to connect Instagram. Without `SMTP_HOST`, development prints each email (with its link) to the API console.

---

## 2. Backend environment (`backend/.env`)

```bash
cp backend/.env.example backend/.env
```

Required (the app refuses to start without them):

| Variable | Example | What it is |
|---|---|---|
| `DB_URL` | `postgresql://postgres.xxx:pwd@aws-0-region.pooler.supabase.com:5432/postgres` | Postgres URL. `postgresql://` is auto-rewritten to `+asyncpg` (API) / `+psycopg` (worker, Alembic) |
| `SECRET_KEY` | 64 random hex chars | JWT signing secret (≥32 bytes) |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | access-token lifetime (refresh token is fixed at 30 days) |
| `IG_APP_ID` / `IG_APP_SECRET` | from Meta dashboard | Instagram app credentials |
| `IG_REDIRECT_URI` | `http://localhost:8000/api/v1/instagram/oauth/callback` | must match the URI registered in Meta **exactly** |
| `TOKEN_ENCRYPTION_KEY` | output of `Fernet.generate_key()` | encrypts stored Instagram tokens (losing it = everyone reconnects) |
| `REDIS_URL` | `redis://localhost:6379/0` | broker + cache |
| `GEMINI_API_KEY` | `AIza...` | Gemini (any non-empty value works in simulation mode) |

Optional (defaults shown):

| Variable | Default | Notes |
|---|---|---|
| `APP_ENV` | `development` | `production` → Secure + `SameSite=None` cookies, no localhost CORS, SMTP required for emails |
| `FRONTEND_URL` | `http://localhost:3000` | OAuth redirect target, email links, CORS/CSRF fallback origin |
| `CORS_ORIGINS` | `""` | comma-separated allowed browser origins; also used by the CSRF origin check |
| `RUN_MIGRATIONS_ON_STARTUP` | `true` | set `false` in production (Render runs migrations pre-deploy) |
| `LOG_LEVEL` | `INFO` | app log level (read from the environment directly) |
| `IG_OAUTH_AUTHORIZE_URL` / `IG_OAUTH_TOKEN_URL` / `IG_GRAPH_BASE_URL` | Instagram's real endpoints | override only to point at a local fake Instagram API for end-to-end runs |
| `TRUSTED_PROXY_HOPS` | `1` | proxies that append to `X-Forwarded-For` (Render = 1; local without a proxy can be 0) |
| `BRIGHT_DATA_API_KEY` | `""` | empty → Bright Data calls are mocked |
| `ASSEMBLYAI_API_KEY` | `""` | empty → transcripts stay empty |
| `AI_MODEL_FLASH` / `AI_MODEL_PRO` | `gemini-2.5-flash` | both default to Flash (free tier); check the model still exists |
| `AI_SIMULATION_MODE` | `false` | `true` mocks all AI/scraping |
| `GEMINI_DAILY_BUDGET` | `20` | max Gemini calls per (Pacific-time) day |
| `GEMINI_REPORT_RESERVE` | `1` | calls kept back for the final report |
| `GEMINI_MAX_RPM` | `5` | max Gemini calls per minute |
| `REPORT_MAX_OWN_VIDEOS` / `REPORT_MAX_COMPETITOR_VIDEOS` | `2` / `3` | videos analysed per report |
| `SYNC_MAX_MEDIA` | `50` | Reels imported per sync (one Insights call each) |
| `AUTO_SYNC_ENABLED` | `true` | Celery beat daily sync + token refresh (also read by the start scripts to decide whether to run beat) |
| `AUTO_SYNC_INTERVAL_HOURS` | `24` | re-sync accounts older than this |
| `IG_TOKEN_REFRESH_DAYS_BEFORE_EXPIRY` | `10` | refresh Instagram tokens this close to expiry |
| `SMTP_HOST` / `SMTP_PORT` | `""` / `587` | empty host = no email sent (dev logs it) |
| `SMTP_USERNAME` / `SMTP_PASSWORD` | `""` | login when set |
| `SMTP_FROM` | `Reelysis <no-reply@reelysis.app>` | sender |
| `SMTP_USE_TLS` | `true` | STARTTLS |
| `PASSWORD_RESET_TOKEN_MINUTES` | `30` | reset-link lifetime |
| `EMAIL_VERIFY_TOKEN_HOURS` | `48` | verification-link lifetime |
| `RATE_LIMIT_ENABLED` / `RATE_LIMIT_STORAGE` | `true` / `redis` | slowapi; `memory` for tests |
| `RATE_LIMIT_AUTH_SIGNUP_PER_HOUR` | `5` | per IP |
| `RATE_LIMIT_AUTH_LOGIN_PER_MINUTE` | `10` | per IP (also reset, verify, change password, delete account) |
| `RATE_LIMIT_AUTH_REFRESH_PER_MINUTE` | `30` | per IP |
| `RATE_LIMIT_AUTH_EMAIL_PER_HOUR` | `5` | forgot password (per IP), resend verification (per user) |
| `RATE_LIMIT_JOB_TRIGGERS_PER_HOUR` | `15` | per user |
| `RATE_LIMIT_AI_TRIGGERS_PER_HOUR` | `10` | per user |

Worker-only (read by `scripts/worker.sh`, not by `config.py`): `WORKER_MODE` = `split` (default) or `single`.

Generate the secrets:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

> ⚠️ Instagram OAuth requires an **HTTPS** redirect URI in most Meta app configurations. For local testing, tunnel (ngrok / cloudflared) and set `IG_REDIRECT_URI` to the tunnel URL.

---

## 3. Frontend environment (`frontend/.env.local`)

```bash
cp frontend/.env.example frontend/.env.local
```

Only one variable is read (`src/lib/axios.ts`):

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000
```

No trailing `/api/v1`. It is inlined at build time.

---

## 4. Running locally

1. Start Postgres and Redis:

```bash
docker run -d --name reelysis-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=reelysis -p 5432:5432 postgres:16
```

```bash
docker run -d --name reelysis-redis -p 6379:6379 redis:7
```

2. Backend API:

```bash
cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements-dev.txt
```

```bash
cd backend && python scripts/run_migrations.py
```

```bash
cd backend && uvicorn app.main:app --reload --port 8000
```

3. Celery workers + beat (separate terminal — **nothing background-related works without them**):

```bash
cd backend && bash scripts/worker.sh
```

4. Frontend:

```bash
cd frontend && pnpm install && pnpm dev
```

Open http://localhost:3000. API docs are at http://localhost:8000/docs. In development, verification and reset links appear in the API console.

---

## 5. Tests

Backend tests run the real app against a real Postgres and Redis on non-default ports (so they never touch your dev DB):

```bash
docker run -d --name reelysis-test-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=reelysis_test -p 5433:5432 postgres:16
```

```bash
docker run -d --name reelysis-test-redis -p 6380:6379 redis:7
```

```bash
cd backend && python -m pytest -q
```

58 tests (unit + integration). Override the targets with `TEST_DB_URL` / `TEST_REDIS_URL`. If Postgres isn't reachable the integration tests are skipped.

### End-to-end run without a Meta app

`backend/scripts/fake_instagram.py` is a local stand-in for Instagram's OAuth and Graph API (one Business account, 20 Reels + 10 photos across two pages, insights, Allow/Cancel consent page). With it and `AI_SIMULATION_MODE=true` the whole product runs offline: signup → verify → connect → sync → niche → competitors → report → dashboard.

```bash
cd backend && python scripts/fake_instagram.py
```

Start the API and worker with these extra variables, then use the app at http://localhost:3000 (or drive it with Playwright):

```dotenv
IG_OAUTH_AUTHORIZE_URL=http://localhost:8090/oauth/authorize
IG_OAUTH_TOKEN_URL=http://localhost:8090/oauth/access_token
IG_GRAPH_BASE_URL=http://localhost:8090
```

To test the reconnect banner, replace the stored token with an invalid one; the fake API answers it with error code 190.

Frontend checks:

```bash
cd frontend && pnpm exec tsc --noEmit && pnpm lint && pnpm build
```

CI (`.github/workflows/ci.yml`) runs both on every push to `master` and every pull request, with Postgres/Redis service containers.

---

## 6. Production topology

| Piece | Host | Command |
|---|---|---|
| Frontend | Vercel (`reelysis-zeta.vercel.app`) | `next build` |
| API | Render Web Service `reelysis-api` | pre-deploy `python scripts/run_migrations.py`, start `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Worker | Render Background Worker `reelysis-worker` | `bash scripts/worker.sh` |
| Postgres | Supabase (Session pooler, port 5432) | — |
| Redis | Render Redis | — |
| Email | any SMTP provider | — |

Defined in `render.yaml` (sets `TRUSTED_PROXY_HOPS=1` on the API and `WORKER_MODE=split`, `AUTO_SYNC_ENABLED=true` on the worker). Both services need the **same** secrets, including `SMTP_*` and `FRONTEND_URL`.

Worker modes (`scripts/worker.sh`):
- `WORKER_MODE=split` (default): two Celery processes — `-Q default` (sync, discovery, reports, with embedded beat) and `-Q slow` (transcription, competitor reel scrapes). Roughly twice the RAM of one process. The script exits when either process dies so the platform restarts it.
- `WORKER_MODE=single`: one process for both queues (fits a 512 MB instance, but long transcriptions delay reports again).
- All workers use `--pool=solo --concurrency=1 --without-gossip --without-mingle --without-heartbeat`.
- If `$PORT` is set (free-tier Web Service), a dummy `http.server` keeps the health check happy.

`scripts/start.sh` (free tier) runs uvicorn plus one worker for both queues (with beat) in a single service.

After deploying migration `c3d4e5f6a7b8`, every user logs in once (old refresh sessions are revoked).

---

## 7. Docs and env templates in git

`.gitignore` still ignores stray `*.md` files and `.env*`, but now whitelists:

```gitignore
!README.md
!docs/
!docs/**/*.md
!.env.example
```

(`frontend/.gitignore` also whitelists `!.env.example`.) So `docs/` and both `.env.example` files are tracked; real `.env` files stay private. That `*.md` rule is why the original docs were lost.

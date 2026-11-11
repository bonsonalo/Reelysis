# Reelysis — Implementation Guide

> A guided tour of the code: what each folder/file does, how the important pieces actually work, and why. Read `ARCHITECTURE.md` first for the big picture.

---

## 0. Repository layout

```
Reelysis/
├── backend/
│   ├── app/
│   │   ├── main.py                 FastAPI app: lifespan (migrations), rate-limit handler, CORS, routers
│   │   ├── api/
│   │   │   ├── dep.py              auth helpers: bcrypt context, create JWT, decode_token, get_current_user
│   │   │   ├── errors.py           internal_error(): log traceback, return generic 500
│   │   │   └── v1/
│   │   │       ├── routes.py       mounts the 5 routers
│   │   │       └── endpoints/      auth, instagram, analysis, competitors, reports
│   │   ├── core/
│   │   │   ├── config.py           pydantic-settings Settings (reads .env)
│   │   │   ├── database.py         async engine (API) + sync engine (worker), session factories
│   │   │   ├── db_url.py           Supabase URL normalisation, SSL, PgBouncer compat
│   │   │   ├── celery_app.py       Celery instance + config
│   │   │   ├── redis.py            async Redis client
│   │   │   ├── cookies.py          set/clear auth cookies
│   │   │   ├── email.py            SMTP sender + reset / verification email templates
│   │   │   ├── middleware.py       OriginCheckMiddleware (CSRF)
│   │   │   ├── rate_limit.py       slowapi limiter + proxy-aware key functions + limit strings
│   │   │   ├── migrations.py       run Alembic programmatically
│   │   │   ├── logger.py           logging setup
│   │   │   └── client/             meta.py (Instagram), social_data.py (Bright Data), assemblyai.py
│   │   ├── model/                  13 SQLModel tables (incl. user_tokens)
│   │   ├── schema/                 Pydantic DTOs + AI output schemas
│   │   ├── service/                business logic + Celery tasks (job_utils = job helpers, scheduled_service = beat tasks)
│   │   └── utils/                  caption, cdn_image, competitor_metrics, password_strength, scoring, time
│   ├── alembic/ + alembic.ini      migrations
│   ├── scripts/                    run_migrations.py, worker.sh, start.sh, real_mode_resync.py
│   ├── tests/                      pytest: test_units.py, test_api.py, conftest.py
│   ├── requirements.txt / requirements-dev.txt
│   └── .env.example
├── frontend/
│   └── src/
│       ├── app/                    Next.js App Router pages
│       ├── features/<name>/        api.ts + hooks/ + components/ per feature
│       ├── components/             shared/, ui/ (shadcn), landing/, auth/, legal/
│       ├── lib/                    axios.ts, queryClient.ts, utils.ts (cn)
│       ├── providers/              Redux, React Query, AuthInitializer
│       └── store/                  Redux store + slices (auth, sidebar)
├── docs/                           this documentation + screenshots
├── .github/workflows/ci.yml        CI: backend tests, frontend typecheck/lint/build
└── render.yaml                     Render blueprint (API + worker)
```

---

## 1. Backend

### 1.1 App bootstrap — `app/main.py`
1. `lifespan`: if `RUN_MIGRATIONS_ON_STARTUP`, runs `alembic upgrade head` before serving.
2. Registers the slowapi `limiter` on `app.state` and a custom 429 handler.
3. Adds `CORSMiddleware` with `allow_origins=settings.cors_origin_list()` and `allow_credentials=True` (cookies). In non-production, `localhost:3000` is always added.
4. Includes all routers (prefix `/api/v1/...` is defined per router).

### 1.2 Configuration — `core/config.py`
`Settings(BaseSettings)` reads `.env`, strips whitespace and validates types (e.g. `ACCESS_TOKEN_EXPIRE_MINUTES: int`). Required fields have no default, so a missing key fails at import with a clear "Invalid configuration" log (the error is re-raised, not swallowed). A module-level singleton `settings` is imported everywhere.

### 1.3 Database — `core/database.py` + `core/db_url.py`

Two engines from one `DB_URL`:

```python
engine      = create_async_engine("postgresql+asyncpg://...")   # FastAPI
sync_engine = create_engine("postgresql+psycopg://...")          # Celery tasks, Alembic
```

`db_url.py` handles Supabase quirks:
- **Driver prefix**: `postgresql://` → `+asyncpg` / `+psycopg`.
- **SSL**: asyncpg won't accept `?sslmode=require`, so the param is removed from the URL and an `ssl.SSLContext` is passed in `connect_args` instead (with hostname verification off for `require`, matching libpq semantics).
- **PgBouncer**: if the host contains `pooler` (or port is 6543), disable prepared-statement caches (`statement_cache_size=0`, `prepared_statement_cache_size=0`, SQLAlchemy `query_cache_size=0`; psycopg `prepare_threshold=None`).
- **Pool**: transaction pooler → `NullPool` (don't hold connections; PgBouncer is the pool). Otherwise `pool_size=5, max_overflow=5`. Always `pool_pre_ping=True`.

`run_async_task(coro_fn, *args)` is how sync Celery tasks run async code: it wraps `asyncio.run()` and disposes the async engine's pool before the event loop closes (pooled asyncpg connections are bound to the loop that opened them, so reusing them in the next task's loop fails).

`get_db()` is a FastAPI dependency yielding an `AsyncSession` (`expire_on_commit=False` so objects stay usable after commit — important for returning them in responses).

Why import every model at the bottom of `database.py`? SQLModel relationships use string names (`"User"`), which only resolve once all model classes are registered.

### 1.4 Auth — `api/dep.py`, `service/auth_service.py`, `core/cookies.py`

**Sessions.** `_issue_session(user)` creates an `AuthSession` row first, then signs:
- an access JWT (`token_type="access"`, `ACCESS_TOKEN_EXPIRE_MINUTES`), and
- a refresh JWT (`token_type="refresh"`, 30 days) with an extra `sid` claim = the session row id,

stores `sha256(refresh_jwt)` on the row and sets both HttpOnly cookies. One row per device.

**Signup** → strength check → unique email → bcrypt hash (in a thread) → insert → `_issue_session` → create an `email_verify` user token and send the email → `{id, name, email, email_verified, created_at}`.

**Login** → bcrypt verify (in a thread) → `_issue_session`.

**Every protected request** → `get_current_user` → `decode_token(cookie, "access")`:

```python
payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])   # PyJWT; any jwt.PyJWTError → ValueError
assert payload["token_type"] == expected_type
payload["id"] = UUID(payload["id"])                               # bad UUID → ValueError
```

`ValueError` becomes a 401. It does not hit the database (stateless).

**Refresh** → decode the refresh cookie → `db.get(AuthSession, sid)` → owner matches → `hmac.compare_digest(row.hash, sha256(token))` → if the row is already revoked: reject, and if it was revoked more than 30 s ago treat it as theft and revoke all the user's sessions → expired? reject → revoke the row and `_issue_session` again (**rotation**).

**Logout** → revoke the session named in this browser's refresh cookie (if valid) and clear cookies. No access cookie required.

**Emailed tokens** (`user_tokens`): `_create_user_token` invalidates earlier unused tokens for the same purpose, stores `sha256(secrets.token_urlsafe(32))`, and returns the raw token for the link. `_consume_user_token` looks up by hash and purpose, rejects used/expired ones, and marks it used.

| Service function | Endpoint | Effect |
|---|---|---|
| `forgot_password_service` | `POST /password/forgot` | same response whether or not the email exists; sends a 30-min link |
| `reset_password_service` | `POST /password/reset` | new hash, email verified, all sessions revoked; endpoint clears cookies |
| `change_password_service` | `POST /password/change` | verify current, new hash, revoke all, new session for this device |
| `verify_email_service` / `resend_verification_service` | `POST /email/verify`, `/email/resend` | set `email_verified_at` / send a fresh 48-h link |
| `delete_account_service` | `DELETE /account` | verify password, `DELETE users` (FKs cascade), clear cookies |

**Why SHA-256 and not bcrypt for tokens?** These tokens are long and random, so a fast hash is safe, and bcrypt only reads the first 72 bytes. Every refresh JWT for a user starts with the same >72 bytes (header + email), so in v1 any of the user's refresh tokens matched any session — revocation and rotation silently did nothing. Passwords still use bcrypt.

**Cookies** — prod: `HttpOnly; Secure; SameSite=None` (frontend and API are different sites). Dev: `SameSite=Lax`, not Secure.

### 1.4b Email — `core/email.py`
`send_email()` uses `smtplib` (STARTTLS when `SMTP_USE_TLS`, login when `SMTP_USERNAME` is set) and returns `False` instead of raising, so an email outage never breaks signup. Auth calls it via `asyncio.to_thread`. With no `SMTP_HOST`: development logs the whole email (including the link) at INFO; production logs an error.

### 1.4c CSRF and errors — `core/middleware.py`, `api/errors.py`
`OriginCheckMiddleware` looks at `Origin` (falling back to `Referer`) on POST/PUT/PATCH/DELETE. If present and not in `cors_origin_list()` (or the API's own origin) → `403 Origin not allowed`. It is added before `CORSMiddleware`, so CORS runs first and the 403 still carries CORS headers. Unexpected exceptions in endpoints go through `internal_error(context)`: full traceback in logs, `"Something went wrong. Please try again."` to the client.

### 1.5 Rate limiting — `core/rate_limit.py`
slowapi decorators on endpoints, e.g.:

```python
@router.post("/sync")
@limiter.limit(job_trigger_limit, key_func=get_user_key)
async def trigger_sync(request: Request, ...):
```

- The limit is a *callable* returning e.g. `"15/hour"`, so it's read from settings at request time.
- `get_ip_key` → `ip:<client ip>`, where the IP is the `X-Forwarded-For` entry `TRUSTED_PROXY_HOPS` from the right (each proxy appends the address it saw; entries further left are client-controlled), else the socket address.
- `get_user_key` → decodes the access cookie to `user:<id>` (falls back to IP).
- Counters live in Redis so limits are shared across API instances.
- slowapi requires the endpoint to accept `request: Request` — that's why those signatures have it.

### 1.6 Instagram integration — `core/client/meta.py`, `service/instagram_service.py`

**OAuth (Instagram API with Instagram Login)**
1. `get_oauth_url()` builds `https://www.instagram.com/oauth/authorize?client_id&redirect_uri&state&response_type=code&scope=instagram_business_basic,instagram_business_manage_insights`.
2. Service stores `oauth_state:{state} → user_id` in Redis (`SETEX 600`). The callback has no cookies from our site guaranteed, so **state is how we know which user is connecting** (and it blocks CSRF-style forged callbacks).
3. Callback: `GET oauth_state:{state}` → delete it (single use) → POST code to `api.instagram.com/oauth/access_token` → GET `graph.instagram.com/access_token?grant_type=ig_exchange_token` for a ~60-day token → `fernet.encrypt(token)` → GET `/me` for profile → upsert account + token.

**Sync task** (`sync_instagram_data_task`, runs in Celery with a **sync** `Session(sync_engine)`):
1. `job_should_start` (skip unless still `queued`) → `mark_running`.
2. `refresh_token_if_expiring`: decrypt; if the token expires within `IG_TOKEN_REFRESH_DAYS_BEFORE_EXPIRY` days call `refresh_access_token` and save it.
3. Refresh profile via `/me` → progress 5.
4. `get_user_media(..., max_items=SYNC_MAX_MEDIA)` follows `paging.next`; `_is_syncable` keeps only `VIDEO` / `REELS`; old non-video rows are deleted.
5. For each Reel: insights (`_parse_insight_metrics` handles `total_value.value` and `values[0].value`) → upsert `MediaItem` by `(user_id, external_media_id)` → insert `MediaMetric` → `set_progress(5 + i/N*90)` → commit (UI sees progress; this is also the heartbeat).
6. Progress 95 → niche detection (skipped if confirmed).
7. `last_synced_at = now`, `mark_succeeded`.
8. `enqueue_transcription_for_user` → `transcription` job on the slow queue.

On error: `rollback()`, re-load the job, `mark_failed`. `InstagramAuthError` (Meta error code 190/102 from `_raise_for_auth_error`) also calls `mark_token_invalid` (sets `expires_at = now`), which makes `GET /instagram/accounts` return `needs_reconnect: true`.

The Meta client methods are `async` (httpx.AsyncClient), so the sync task calls them with `asyncio.run(...)` each time. The client never logs OAuth codes or tokens.

**Reconciler** (`reconcile_instagram_sync_job`): fail a queued job that a newer finished sync superseded; otherwise delegate to `job_utils.reconcile_job` with a re-dispatch callback (see §1.14b).

**Other helpers**: `enqueue_sync_job_sync` (used by the scheduler), `get_connected_accounts_service` (adds `token_expires_at`, `needs_reconnect`), `detect_instagram_niche_service` (Gemini in `asyncio.to_thread`).

### 1.7 AI layer — `service/ai_service.py`

All Gemini calls go through a few shared guards:

| Guard | How | Why |
|---|---|---|
| `reserve_gemini_call()` | Redis `INCR gemini_usage:<Pacific date>`; if > budget, `DECR` and return False; **fails closed** if Redis errors | daily free-tier cap (20) — atomic across processes; Google resets at midnight Pacific |
| `_throttle_gemini_rpm()` | Redis `INCR gemini_rpm:<minute>`; if > max, `DECR`, sleep until next minute (max 6 tries) | 5 requests/minute limit |
| `_generate_content_with_retry()` | up to 5 attempts; per-minute 429 → sleep "retry in Xs" (≤60); 503/high-demand → linear backoff; **per-day 429 → raise `GeminiQuotaExceededError` immediately** | don't waste time retrying something that can't succeed today |
| `_is_gemini_daily_quota_error` | looks for `PerDay` vs `PerMinute` in the error text | both errors share the same 429 code/metric |

Gemini features used:

1. **Niche detection** — plain text prompt → short label.
2. **Competitor handle suggestions** — prompt with niche + creator context (bio, 5 captions, follower count), strict rules (same niche, real, ≥10k, exact handle), `response_mime_type="application/json"` → `["handle1", ...]`. Cached in Redis 7 days.
3. **Video analysis** — prompt with caption, transcript (or a note that none exists), hashtags and a scoring rubric; `response_schema=VideoAnalysisResponse` (a Pydantic model) → Gemini returns JSON that matches it; `response.parsed` gives a typed object.
4. **Strategic report** — user brief + competitor brief as JSON → `response_schema=StrategicReportResponse` (summary, trends, strengths, gaps, advantages, roadmap[], report_markdown).

**Structured output** is the key technique: instead of asking for JSON in prose and regex-parsing, the schema is passed to the model so output is guaranteed (well, strongly constrained) to parse.

All guards share one Redis client per process (`_get_sync_redis`).

**Simulation mode** short-circuits every function with deterministic fake data (the fake report includes two roadmap items), so the whole pipeline can be demoed with zero API keys.

### 1.8 Competitor discovery — `service/competitor_service.py`, `core/client/social_data.py`

Bright Data works asynchronously: you **trigger** a dataset collection and get a `snapshot_id`; you **poll** `/snapshot/{id}` — `202` means "still collecting".

Discovery task (`poll_competitor_results_task`, async code under `asyncio.run`, async session):

```
progress 0   mark running
             gather context: own username (excluded), existing handles (fallback), 10 captions
             Gemini → up to 15 handles  (cache unless refresh mode)
             Bright Data trigger profiles dataset with instagram.com/<handle>/ URLs
progress 10  store snapshot_id + suggested_handles in job.input_payload
10 → 90      poll snapshot with delays [0,15,20,25,30, 30×12, 45×4]  (~10.5 min max)
             normalise rows (handles many field-name variants: followers/followers_count/…, "12.5k" → 12500)
             delete previous auto-discovered competitors (keep manual)
             keep only suggested handles with ≥10k followers and ≥20 posts
             sort by followers desc, engagement desc; save up to (10 − manual) rows
             prefetch each avatar into Redis while the CDN URL is fresh
progress 100 succeeded
             send_task(fetch_competitor_media_batch_task, top 5)
```

Media batch (slow queue): trigger the reels dataset per competitor (`num_of_posts: 5`), poll all snapshots together, and **upsert** up to 5 reels each (`_save_competitor_media`): a row matching the provider id or permalink is refreshed (metrics, URLs, publish date; transcript and analyses kept), otherwise inserted. `normalize_competitor_media` parses the real publish date (`date_posted` / `timestamp` / `taken_at`) and counts like `"1.2k"`. Then enqueue transcription.

"Top 5" competitors (`_get_top_competitors`) are ordered by followers, then engagement.

`normalize_competitor_profiles` is defensive because Bright Data returns either *profile* records or *post* records depending on the dataset; post records are aggregated per handle.

### 1.9 Transcription — `service/transcript_service.py`, `core/client/assemblyai.py`
- Targets = own + competitor media where type is VIDEO/REEL and transcript is missing or simulated; items with a URL first.
- For each: `POST /v2/transcript {"audio_url": media_url}` → poll every 3 s up to 5 min → save text + source.
- AssemblyAI fetches the video itself; our server never downloads media (saves bandwidth/memory on a 512 MB box).
- Two entry points: `run_transcription_task` (Celery job on the `slow` queue, with progress) and `run_transcription_sync(user_id, on_item)` (inline, called by the report task; `on_item` is a heartbeat callback).

### 1.10 Video analysis — `service/video_analysis_service.py`
- Finds videos with **no** `VideoAnalysis` row via LEFT OUTER JOIN … `WHERE video_analysis.id IS NULL`.
- `_select_videos_for_budget`: newest own videos (max 2), highest-engagement competitor videos (`views + likes×10 + comments×5`, max 3), never more than remaining budget minus reserve.
- For each: heartbeat (`on_item`), compute engagement score from latest metrics, call `analyze_video_service`, normalise scores (negatives clamp to 0), cap confidence at 65 if no transcript, insert `VideoAnalysis` (full JSON in `analysis_detail`).
- On any error (including `GeminiQuotaExceededError`) the job is rolled back and marked failed; quota errors are then re-raised so the report task can fail with the right message.
- `get_video_analysis_service` returns `{media, analysis, metrics}` for the detail page.

### 1.11 Reports — `service/report_service.py`
See `WORKFLOW.md §5`. Notable details:
- **Idempotent trigger**: returns the active job instead of starting a second one.
- Mixes styles: the task is async (`asyncio.run`) but calls the sync transcription/analysis functions via `asyncio.to_thread`, passing `heartbeat = lambda: heartbeat_sync(job_id)` so the report job stays "alive" during those minutes.
- Two budget checks: before analysis (need budget or existing analyses) and before the final write-up (need ≥1 call).
- Competitor brief: "winning topics" = hook ≥ `WINNING_HOOK_SCORE` (80), "successful formats" = hook ≥ `STRONG_HOOK_SCORE` (70).
- Report, recommendations and `succeeded` are committed in **one transaction**; title uses UTC.
- On error: `rollback()`, re-load the job, `mark_failed` (message truncated to 2000 chars).

### 1.12 Dashboard — `service/dashboard_service.py`
- **Latest vs previous snapshot per reel**: query all metrics ordered by `(media_item_id, captured_at desc)`, walk once; first row per reel = latest, second = previous. Sum each set → % change.
- **Growth chart**: for each `(day, reel)` keep the "best" snapshot (most views, then reach, then latest), sum per day.
- **Recent videos / pillars**: `_latest_metrics_by_media` and `_latest_analysis_by_media` fetch the latest row per media item for a whole page in one query each (no N+1). `/dashboard/videos` supports `limit` + `offset` and returns `total`.
- **Engagement** = `total_interactions / reach × 100` (dashboard) vs `interactions / views × 100` (per-video engagement score) — two different definitions, worth knowing.

### 1.13 Avatar proxy — `utils/cdn_image.py`
Instagram CDN URLs (a) refuse hotlinking from other sites and (b) **expire** after some time. So:
1. When competitors are saved/refreshed, `prefetch_competitor_avatar` downloads the image server-side (browser-like headers + `Referer: instagram.com`) and caches bytes + content-type in Redis for 7 days.
2. `GET /competitors/{id}/avatar` serves from Redis; on miss it tries the CDN; on CDN failure returns 404 with a hint.
3. Host allow-list prevents the proxy being abused to fetch arbitrary URLs (SSRF).

### 1.14 Celery wiring — `core/celery_app.py`
- `include=[...]` lists every service module (including `scheduled_service`) so the worker registers their `@celery_app.task`s.
- Tasks have explicit `name=` strings; the API uses `send_task(name, args=[...])` so it never imports task code (IDs are strings because JSON can't serialise UUIDs).
- `task_default_queue="default"`; `task_routes` sends `run_transcription_task`, `fetch_competitor_media_task` and `fetch_competitor_media_batch_task` to `slow`.
- `beat_schedule`: `enqueue_due_syncs_task` hourly at :15, `refresh_expiring_tokens_task` daily at 03:00 UTC.
- `worker_prefetch_multiplier=1` → each worker grabs one message at a time.

### 1.14b Job helpers — `service/job_utils.py`
| Helper | What it does |
|---|---|
| `set_progress(job, n)` | clamp 0–100, set `progress` **and** `updated_at` (the heartbeat) |
| `mark_running / mark_succeeded / mark_failed` | status + timestamps (+ progress 100 / error message ≤2000 chars) |
| `heartbeat_sync(job_id)` | bump `updated_at` with its own session — for threads that don't hold the job |
| `job_should_start(job)` | workers only run `queued` jobs (makes re-dispatch safe and respects reconciler failures) |
| `reconcile_job(...)` | queued ≥ 30 min → failed; running with no heartbeat for 15 min → failed; optional re-dispatch of a queued job after 2 min, max 3 times, ≥2 min apart (`retry_count`) |
| `reconcile_generic_job` | used for `transcription` / `video_analysis` |

`analysis_service` routes every active job through the right reconciler on `GET /analysis/jobs` and `GET /analysis/jobs/{id}`.

### 1.14c Scheduler — `service/scheduled_service.py`
- `enqueue_due_syncs_task`: accounts with `last_synced_at` older than `AUTO_SYNC_INTERVAL_HOURS` and a non-expired token, oldest first, max 25 per run → `enqueue_sync_job_sync` (skips users with an active sync). No-op when `AUTO_SYNC_ENABLED=false`.
- `refresh_expiring_tokens_task`: tokens expiring within `IG_TOKEN_REFRESH_DAYS_BEFORE_EXPIRY` days → `refresh_token_if_expiring`; `InstagramAuthError` → `mark_token_invalid`.

### 1.15 Scripts
| Script | Purpose |
|---|---|
| `scripts/run_migrations.py` | `alembic upgrade head` (Render pre-deploy) |
| `scripts/worker.sh` | Two solo-pool workers (`-Q default` with embedded beat, `-Q slow`); `WORKER_MODE=single` = one worker for both; exits when either dies; dummy HTTP server if `$PORT` set |
| `scripts/start.sh` | API + one worker for both queues (+ beat) in one process (free tier) |
| `scripts/real_mode_resync.py` | One-off: wipe simulated transcripts and all video analyses, then re-trigger real syncs (`--user-id`, `--dry-run`) |

---

### 1.16 Logging — `core/logger.py`, `alembic/env.py`
`LOG_LEVEL` (default INFO). The app logger's level is set explicitly and Alembic's `fileConfig` runs with `disable_existing_loggers=False`. Without both, running migrations on API startup disabled the app logger and reset root to WARNING — every app log vanished after startup.

### 1.17 Tests — `backend/tests/`
- `conftest.py` sets a test environment (simulation mode, rate limits off, SMTP empty) and points at Postgres on **5433** and Redis on **6380** (override with `TEST_DB_URL` / `TEST_REDIS_URL`). It runs the real Alembic migrations once, truncates tables per test, captures outgoing email tokens with `monkeypatch`, and drives the real app through `httpx.ASGITransport`.
- `test_units.py` — pure helpers: token decoding, SHA-256 vs a 72-byte shared prefix, password rules, score normalisation, DB URL normalisation, proxy-aware IP, Origin parsing, Reels-only filter, insight parsing, competitor media parsing, heartbeat age, report thresholds.
- `test_api.py` — integration: signup/login, 401 not 500, refresh rotation + old-token rejection, multi-device logout, verify/resend, forgot/reset/expired link, change password, delete account, CSRF, OAuth callback errors, heartbeat reconciliation, job ownership, dashboard pagination, scheduler, reconnect flag.
- 46 tests (with parametrisation); `pytest.ini` uses a session-scoped asyncio loop so the global async engine works across tests.
- CI (`.github/workflows/ci.yml`) runs them with Postgres/Redis service containers, plus frontend `tsc --noEmit`, `lint` and `build`.

---

## 2. Frontend

### 2.1 Stack
Next.js 16.2 (App Router) · React 19.2 · TypeScript strict · Tailwind v4 (CSS-first config in `globals.css`, orange `#f97316` primary) · shadcn/ui pieces · TanStack React Query 5 · Redux Toolkit 2 · axios · Recharts 3 · react-markdown · lucide icons · Geist font.

### 2.2 Providers — `src/providers/`
`AppProviders` = `ReduxProvider > QueryProvider > AuthInitializer`. React Query devtools are mounted (no-op in prod).

`AuthInitializer` loads the current user (`GET /auth/profile`) on every route **except** dashboard routes, whose layout does it itself; `useCurrentUser` copies the result into Redux in an effect, so cache hits update Redux too.

**State split (a common interview question):**
- **React Query** owns *server state* — everything that comes from the API (accounts, jobs, stats, competitors, reports, avatar blobs). It handles caching, deduping, background refetch and polling.
- **Redux** owns *client state* — `auth` (`currentUser` incl. `email_verified`, `isAuthenticated`, `status`, `error`) and `sidebar` (`isMobileOpen`).

React Query defaults (`lib/queryClient.ts`): `staleTime: 5 min`, `retry: 1`, `refetchOnWindowFocus: false`. Dashboard queries override `staleTime: 0`.

### 2.3 HTTP + auth — `src/lib/axios.ts`, `src/lib/utils.ts`
```ts
export const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL, withCredentials: true })
```
Response interceptor: on a 401 for a non-auth URL, await **one shared** refresh promise (`refreshSession()` — parallel 401s reuse it, because two refreshes with a rotating token would revoke each other), then replay the request once (`_retry`). If refresh fails, hard-redirect to `/login` unless on a `PUBLIC_PAGES` route (`/`, `/login`, `/register`, `/privacy`, `/terms`, `/forgot-password`, `/reset-password`, `/verify-email`). Tokens are never read by JS.

`getApiErrorMessage(error, fallback)` turns any axios error into text: 429 → "Too many attempts…", string `detail` as is, and FastAPI 422 arrays (`[{loc, msg}]`) → the first `msg` without pydantic's "Value error, " prefix. Every form and mutation uses it — rendering the raw 422 array used to crash the page. `isNotFoundError` distinguishes real 404s from other failures.

### 2.4 Routing — `src/app/`
| Route | File | Notes |
|---|---|---|
| `/` | `page.tsx` | marketing landing (content in `components/landing/landingContent.ts`) |
| `/login`, `/register` | `(auth)/…` | route group with `AuthShell` layout; login shows "Password updated" on `?reset=1`; register shows the live password rules |
| `/forgot-password`, `/reset-password?token=`, `/verify-email?token=` | `(auth)/…` | account recovery and verification (verify auto-submits once) |
| `/onboarding` | `onboarding/page.tsx` | wizard (below) |
| `/dashboard`, `/videos`, `/videos/[id]`, `/competitors`, `/reports`, `/reports/[id]`, `/settings` | `(dashboard)/…` | shared layout = auth guard + sidebar + email-verification banner |
| `/privacy`, `/terms` | static | needed for Meta app review |

**Guard**: `(dashboard)/layout.tsx` calls `useCurrentUser()` (`GET /auth/profile`); loading → spinner; not authenticated → `router.push('/login')`. All guarding is client-side (no Next middleware). After login/register, `postAuthDestination(accounts)` (`features/instagram/utils.ts`) sends the user to `/dashboard` if `isOnboarded` (account + confirmed niche + synced) else `/onboarding` — the landing page uses the same helper.

### 2.5 Feature folders — `src/features/`
Each feature = `api.ts` (plain axios functions + TS types) → `hooks/` (React Query wrappers) → `components/`.

| Feature | Hooks | Endpoints |
|---|---|---|
| auth | `useLogin`, `useRegister`, `useLogout`, `useCurrentUser`; `useAccountSecurity.ts`: `useForgotPassword`, `useResetPassword`, `useChangePassword`, `useVerifyEmail`, `useResendVerification`, `useDeleteAccount` | `/auth/*` |
| instagram | `useInstagramAccounts`, `useTriggerSync`, `useConfirmNiche`, `useUpdateNiche`, `useDetectNiche`, `useDisconnectInstagram`, `useStartInstagramOAuth`, `useAnalysisJob(type)`, `useAnalysisJobById(id)` | `/instagram/*`, `/analysis/jobs*` |
| dashboard | `useDashboardStats`, `useDashboardGrowth`, `useContentPillars`, `useDashboardVideos(limit)`, `useAllVideos` (infinite, 24 per page), `useVideoAnalysis(id)` | `/analysis/dashboard/*`, `/analysis/videos/{id}` |
| competitors | `useCompetitors`, `useAddCompetitor`, `useRemoveCompetitor`, `useRediscoverCompetitors` | `/competitors/*` |
| reports | `useReports`, `useReport(id)`, `useGenerateRoadmap`, `useUpdateRecommendation` | `/reports/*`, `/analysis/report/roadmap/{id}` |
| jobs | `jobProgressUtils.ts` | — (pure functions) |
| settings | tab components, `ChangePasswordForm`, `DeleteAccountDialog` | uses auth + instagram hooks |

`useLogout` always clears the React Query cache and Redux and goes to `/login`, even if the server call fails. `useResetPassword` does the same clearing on success. `useConfirmNiche` / `useUpdateNiche` (with discovery) / rediscover refetch `['analysis-job','competitor_discovery']` and competitors so discovery polling starts immediately.

### 2.6 The polling pattern
Every job-tracking query uses a **function** `refetchInterval`:

```ts
useAnalysisJobById(jobId, {
  refetchInterval: (query) =>
    ['running', 'queued'].includes(query.state.data?.status ?? '') ? 3000 : false,
})
```

So polling starts when a job is active and stops by itself when it's `succeeded`/`failed`. After completion, the page invalidates the related queries (e.g. dashboard stats) so fresh data loads.

Intervals: onboarding accounts 2 s (while analysing, stops if the sync failed), jobs 3 s, dashboard sync job 2 s with a 5-minute client-side give-up (a real `setTimeout`), competitors list 3–5 s while discovery runs.

### 2.7 Progress → human stages — `features/jobs/utils/jobProgressUtils.ts`
The backend only reports a number (0–100). The frontend maps ranges to checklist items that match what the backend does at that progress:

| Job | Stages (progress range) |
|---|---|
| Sync | Connecting to Instagram (0–5) · Importing Reels & metrics (5–95) · Detecting niche (95–100) |
| Discovery | Searching niche (0–35) · Fetching profiles & Reels (35–75) · Ranking (75–100) |
| Report | Pulling competitor data (0–55) · Analysing videos (55–82) · Benchmarking (82–88) · Writing strategy (88–100) |

`phaseStatus(progress, start, end, status)` returns pending/running/completed for each stage.

### 2.8 Onboarding wizard — `app/onboarding/page.tsx`
Local state machine: `CONNECT → ANALYZING → NICHE → FINDING_COMPETITORS → COMPETITORS → GENERATING_ROADMAP → COMPLETED`.

The step is **derived from server state** in a `useEffect` (account exists? synced? niche detected/confirmed? discovery job? competitors? report job?), so a refresh resumes at the right place. Once at `COMPETITORS` or later it is deliberately "sticky" (not re-derived) so the user isn't yanked back — that one effect carries a scoped `eslint-disable react-hooks/set-state-in-effect` with the reason. The move from `GENERATING_ROADMAP` to `COMPLETED` is computed at render time from the report job's status.

- `CONNECT`: `useStartInstagramOAuth` → `GET /instagram/oauth/start` → `window.location.href = oauth_url`. Success comes back as `/onboarding?connected=true`; errors as `?connected=false&error=…`, shown via `getOAuthErrorMessage`.
- `ANALYZING`: auto-triggers the first sync once; polls accounts every 2 s; on failure shows "Retry sync" (or "Reconnect Instagram" when `needs_reconnect`).
- `NICHE`: prefilled with `niche_detected` (empty if detection failed); confirm → backend saves and starts discovery → discovery job refetched.
- `FINDING_COMPETITORS` / `COMPETITORS`: checklist; retry / add manually; the tracked list with Remove per row (no fake selection).
- `GENERATING_ROADMAP`: `POST /reports/generate`, poll that job id; Retry / "Skip and continue" on failure.
- `COMPLETED`: dashboard + report buttons; if the report was skipped after a failure, the copy says so and links to Reports.

### 2.9 Dashboard page — `app/(dashboard)/dashboard/page.tsx`
Header with username, last-synced time, niche + edit link, "New Analysis" (sync) button → 4 stat cards (`DashboardStatCard`, colour by sign of change, `MetricInfoTip` explanations) → `GrowthChart` (Recharts, y-axis rounded up with 20% headroom, dots only when ≤14 points) → competitors panel (top 5) → content pillars table → recent Reels grid (`ReelCard`, `ReelThumbnail` with `referrerPolicy="no-referrer"` and fallback icon).

### 2.10 Other notable components
- `CompetitorAvatar` — fetches `/competitors/{id}/avatar` via axios as a **blob** (so cookies + refresh logic apply) through React Query (`['competitor-avatar', id]`, no refetch/retry), so each avatar is fetched once even though `/competitors` mounts both a mobile list and a desktop table.
- `MetricInfoTip` — custom tooltip rendered with `createPortal` to `document.body`, positioned with `getBoundingClientRect`.
- `ProcessStatus` / `ProcessingStatusLine` — checklist and shimmer status line used by every job UI (`tw-animate-css` is imported in `globals.css` for their fade-ins).
- `PageErrorState` — error panel with a retry button, used by `/videos`, `/reports`, video detail and report detail ("not found" is shown only for real 404s).
- `EmailVerificationBanner` — shown in the dashboard layout when `email_verified === false`, with "Resend email".
- `ReconnectInstagramBanner` — dashboard + Settings when `needs_reconnect`, restarts OAuth.
- `ReportGenerationError` — maps raw backend error text to friendly messages (daily limit, rate limit, timeout, high demand).
- `DisconnectInstagramDialog` / `DeleteAccountDialog` — explicit confirmation (checkbox / password); the disconnect dialog body mounts only while open, so its checkbox always starts unticked.
- Report detail renders `report_markdown` with `react-markdown` (no raw HTML → XSS-safe) and the recommendations as a filterable checklist. **Export PDF** calls `window.print()`; the `@media print` rules in `globals.css` hide the sidebar, banners and buttons and print `.print-report` black on white.
- Settings: the active tab comes straight from `?tab=` and the niche draft is "user edit ?? saved value" (derived, not copied into state by an effect). Profile tab = Reelysis login + delete account; Instagram tab = connection + niche; Security tab = change password (live rule checklist) + 2FA "coming soon".
- `/videos` uses `useAllVideos` (infinite query, `offset`/`total`, 24 per page) with "Load more".

### 2.11 Lint & checks
`pnpm lint` has 0 errors. `eslint.config.mjs` exempts the shadcn-generated `src/components/ui/**` from `no-explicit-any`. The remaining warnings are intentional (plain `<img>` for Instagram CDN images, a couple of hook-dependency warnings).

---

## 3. Conventions you'll see

- Backend layering: endpoint → service → model. Endpoints translate exceptions: `ValueError` → 400 (user-facing message), `HTTPException` re-raised, everything else → `internal_error()` (generic 500, traceback in logs).
- Every DB query filters on `user_id` (multi-tenancy by convention).
- Time is always naive UTC via `utc_now()`; "unset" timestamps are the Unix epoch.
- Celery tasks receive string IDs and re-load rows themselves (never pass ORM objects to a queue).
- Frontend query keys: `['analysis-job', type]`, `['analysis-job-by-id', id]`, `['dashboard-stats']`, `['competitors']`, `['reports']`, `['report', id]`, `['instagram-accounts']`, `['current-user']`.

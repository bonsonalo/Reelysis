# Reelysis — Challenges, Known Issues & Revival Checklist

> Severity: 🔴 broke a feature / security risk · 🟠 wrong results or bad UX in common cases · 🟡 code quality / scale.
>
> Nov 2026: the code was reviewed end to end and most of what was found has been fixed. §2 lists those fixes with where they live. §3 lists what is still open.

---

## 1. Challenges that were already solved in v1 (good interview stories)

| Challenge | What happened | How it was solved | Where |
|---|---|---|---|
| Render couldn't reach Supabase | Supabase's direct DB host is IPv6-only; Render egress is IPv4 → `Network is unreachable` | Switched to Supabase **Session pooler** host | `DB_URL` |
| Wrong DB driver | `postgresql://` made SQLAlchemy pick `psycopg2` (not installed) | `db_url.py` rewrites to `postgresql+asyncpg://` (API) and `postgresql+psycopg://` (worker/Alembic) | `core/db_url.py` |
| `DuplicatePreparedStatementError` | PgBouncer reuses server connections, asyncpg's named prepared statements collide | `statement_cache_size=0`, `prepared_statement_cache_size=0`, `query_cache_size=0`, `NullPool`; psycopg `prepare_threshold=None` | `core/database.py`, `core/db_url.py` |
| SSL params rejected | asyncpg rejects `?sslmode=` in the URL | Strip SSL params from the URL and pass an `ssl.SSLContext` in `connect_args` | `core/db_url.py` |
| Gemini free tier (20/day, 5/min) | One report burst many calls → 429s, half-finished reports | Redis daily counter, Redis fixed-window RPM throttle, reserve 1 call for the final report, cap 2 own + 3 competitor videos, distinguish per-day vs per-minute 429 | `service/ai_service.py` |
| Jobs stuck "running" forever | Worker crash/restart left rows in `running` | "Reconcilers" run on poll and fail stale jobs (redesigned in Nov 2026 — see §2.1) | `service/job_utils.py` |
| Aborted transaction on failure | Worker DB error left the session in a failed transaction, so writing `status=failed` also failed | `rollback()` before writing the failure (now done in every task) | services |
| Instagram CDN blocks hotlinking | Competitor avatars broke in the browser | Backend proxy `/competitors/{id}/avatar`, prefetch bytes into Redis while the URL is fresh | `utils/cdn_image.py` |
| Cross-origin cookies (Vercel ↔ Render) | Cookies not sent across sites | `SameSite=None; Secure` in production + explicit CORS origins + `allow_credentials` + axios `withCredentials` | `core/cookies.py`, `main.py` |
| LLM hallucinated competitor handles | Gemini suggested accounts that don't exist / are tiny | Ask for 15, verify each via Bright Data, keep only ≥10k followers & ≥20 posts | `competitor_service.py` |
| Growth chart showing ×N views | Every sync inserts a metrics row; summing all rows multiplied views | Keep only the latest snapshot per reel per day | `dashboard_service.get_growth_chart_service` |
| Gemini returning 1–10 instead of 0–100 | Inconsistent hook scores | Explicit rubric in prompt + `normalize_score_0_100` | `utils/scoring.py` |

---

## 2. Bugs found and fixed (Nov 2026)

Every fix below is covered by the backend test suite (`backend/tests`, 58 tests) or was checked in the browser, unless marked *(not testable without real API keys)*.

### 2.1 Background jobs & timing
| Sev | Bug | Fix | Where |
|---|---|---|---|
| 🔴 | Reconcilers failed jobs by **time since start** (report 10 min, sync 120 s, discovery 12 min), shorter than real runs. A live job was marked failed, then the worker overwrote it with `succeeded`. | Workers heartbeat (`updated_at`) on every progress update via `set_progress`; a running job fails only after **15 min with no heartbeat**. The report task heartbeats from inside long transcription/analysis loops (`heartbeat_sync`). | `service/job_utils.py`, `report_service.py`, `transcript_service.py`, `video_analysis_service.py` |
| 🔴 | Solo worker = head-of-line blocking: a transcription batch (minutes per video) sat in front of a user's report, which was then failed after 3 min "queued". | Two Celery queues: `default` (sync, discovery, reports) and `slow` (transcription, competitor reel scrapes). `worker.sh` runs one process per queue. Queued timeout is now 30 min. | `core/celery_app.py`, `scripts/worker.sh` |
| 🔴 | **Second async Celery task in a worker process crashed** (`got Future attached to a different loop`) whenever the DB used a normal connection pool (local dev / any non-pooler host). Each task's `asyncio.run()` opens a new event loop, but pooled asyncpg connections stay bound to the old one; the job was left `queued`. Production never hit it only because Supabase pooler URLs use `NullPool`. | `run_async_task()` runs the task body and calls `await engine.dispose()` before the loop closes; used by the report and all competitor tasks. Verified by running 3 report tasks in one process. | `core/database.py`, `report_service.py`, `competitor_service.py` |
| 🟠 | A queued sync was **re-dispatched on every poll** after 15 s (a new Celery message every 2–3 s). | Re-dispatch at most 3 times, at least 2 min apart (`retry_count`). | `job_utils.reconcile_job` |
| 🟠 | Workers could start a job twice (re-dispatch) or run a job the reconciler had already failed. | `job_should_start`: workers only pick up `queued` jobs. | `job_utils.py` + every task |
| 🟠 | `video_analysis` job stayed `running` forever on a Gemini quota error; transcription/video-analysis had no reconciler. | Job marked failed before re-raising; generic reconciler for all job types. | `video_analysis_service.py`, `analysis_service.py` |
| 🟠 | Failure handlers in sync / discovery / analysis committed without `rollback()`. | Roll back, re-load the job, then `mark_failed`. | services |
| 🟡 | Report rows and roadmap were committed separately from the job status. | Report + recommendations + `succeeded` saved in one transaction. | `report_service.py` |

### 2.2 Auth & security
| Sev | Bug | Fix | Where |
|---|---|---|---|
| 🔴 | **Refresh-token revocation didn't work.** Refresh JWTs were bcrypt-hashed, but bcrypt only reads the first 72 bytes, and every refresh JWT for a user shares a longer prefix (header + email). Any old/revoked refresh token for that user still matched. | Refresh JWT carries a session id (`sid`); the session row is looked up by id and compared with a **SHA-256** hash of the full token (`hmac.compare_digest`). Reuse of a rotated token after a 30 s grace window revokes all the user's sessions. The migration revokes the old bcrypt sessions (users log in again). | `service/auth_service.py`, migration `c3d4e5f6a7b8` |
| 🔴 | Instagram auth code and token response body were `print`ed / logged. | All secret logging removed; only status codes are logged on failure. | `core/client/meta.py`, `endpoints/instagram.py` |
| 🔴 | PyJWT errors were caught with python-jose's exception class → invalid tokens could 500 instead of 401. | `decode_token()` catches `jwt.PyJWTError` and bad UUIDs, raising `ValueError` → 401. `python-jose` removed. | `api/dep.py` |
| 🟠 | Logout revoked an arbitrary session and required a valid access cookie. | Logout revokes the session in *this browser's* refresh cookie and works without an access cookie. | `auth_service.logout_service` |
| 🟠 | No CSRF protection with `SameSite=None` cookies. | `OriginCheckMiddleware`: POST/PUT/PATCH/DELETE with an `Origin`/`Referer` not in the allowed list → `403 Origin not allowed`. | `core/middleware.py` |
| 🟠 | 500 responses returned `str(e)` (SQL, URLs, provider messages). | `internal_error()` logs the traceback and returns a generic message. | `api/errors.py`, endpoints |
| 🟡 | Rate-limit IP taken from the client-controlled first `X-Forwarded-For` entry. | Uses the entry `TRUSTED_PROXY_HOPS` from the right. | `core/rate_limit.py` |
| 🟡 | bcrypt ran on the event loop. | `asyncio.to_thread` for hash/verify. | `auth_service.py` |
| 🟡 | `redirect_uri` not URL-encoded; OAuth failures returned raw JSON. | `urlencode`; callback redirects to `/onboarding?connected=false&error=access_denied|invalid_state|connect_failed`. | `meta.py`, `endpoints/instagram.py` |
| 🟡 | Password reset left the current browser looking logged in (stateless access cookie still valid). | Reset response clears this browser's cookies; frontend clears its cache/Redux. | `endpoints/auth.py`, `useAccountSecurity.ts` |

### 2.3 Data correctness
| Sev | Bug | Fix | Where |
|---|---|---|---|
| 🟠 | Competitor brief used `hook_score >= 8 / 7` on 0–100 scores → every video "winning". | `WINNING_HOOK_SCORE = 80`, `STRONG_HOOK_SCORE = 70`. | `report_service.py` |
| 🟠 | Only the first page of Instagram media was imported; photos/carousels counted as Reels. | Follows `paging.next` up to `SYNC_MAX_MEDIA` (50); imports only videos/Reels and deletes old non-video rows. *(not testable without real API keys)* | `meta.get_user_media`, `instagram_service.py` |
| 🟠 | Competitor media duplicated on every fetch; `published_at` = fetch time; provider id never stored. | Upsert by provider id or permalink; `provider_media_id` is now text; real date parsed from `date_posted`/`timestamp`/`taken_at`; `"1.2k"` counts coerced. | `competitor_service._save_competitor_media`, `social_data.py` |
| 🟡 | "Top 5 competitors" had no `ORDER BY`. | Ordered by followers, then engagement. | `competitor_service._get_top_competitors` |
| 🟡 | Freshness age treated naive UTC as local time. | Plain naive-UTC subtraction. | `competitor_data_needs_refresh` |
| 🟡 | Own media lookup ignored `user_id`. | Lookup scoped by user. | `instagram_service.py` |
| 🟡 | Gemini daily counter used the server date; Google resets at midnight Pacific. | Key uses the `America/Los_Angeles` date. | `ai_service._gemini_usage_key` |
| 🟡 | Budget failed **open** if Redis was down. | Fails closed. | `ai_service.reserve_gemini_call` |
| 🟡 | Negative AI scores normalised to −50 (found by a new test). | Clamped to 0. | `utils/scoring.py` |
| 🟡 | Report title used local time. | UTC. | `report_service.py` |

### 2.4 Performance & operations
| Sev | Bug | Fix | Where |
|---|---|---|---|
| 🟠 | Gemini niche detection blocked the API event loop. | `asyncio.to_thread`. | `detect_instagram_niche_service` |
| 🟠 | N+1 queries on recent videos and content pillars. | Batched "latest metric / latest analysis per media" queries. | `dashboard_service.py` |
| 🟡 | No DB indexes on filter/FK columns. | 15 indexes (declared on the models and in migration `c3d4e5f6a7b8`; `alembic check` is clean). | models, migration |
| 🟡 | New Redis connection per Gemini guard call. | One shared client per process. | `ai_service._get_sync_redis` |
| 🟠 | **App logs went silent after startup migrations**: Alembic's `fileConfig()` disabled existing loggers and set root to WARNING. | `fileConfig(..., disable_existing_loggers=False)` and an explicit app logger level (`LOG_LEVEL`, default INFO, was DEBUG). | `alembic/env.py`, `core/logger.py` |
| 🟡 | Config errors were swallowed, failing later with `NameError: settings`. | Re-raised with a clear log line. | `core/config.py` |

### 2.5 Frontend
| Sev | Bug | Fix | Where |
|---|---|---|---|
| 🔴 | **A FastAPI 422 crashed the page**: `detail` is an array of objects and was rendered directly ("Objects are not valid as a React child"). | All error display goes through `getApiErrorMessage()` (string or first `msg`). | `lib/utils.ts`, auth hooks, settings, competitor form |
| 🟠 | Onboarding stuck on "generating" after a successful report. | Auto-advances to COMPLETED with dashboard/report buttons. | `app/onboarding/page.tsx` |
| 🟠 | Discovery progress froze after "Confirm niche". | Niche confirm/update/rediscover refetch the discovery job and competitors. | `useConfirmNiche.ts`, `useNiche.ts`, `useCompetitors.ts` |
| 🟠 | No retry after a failed first sync; endless polling if niche detection failed. | Retry / Reconnect buttons; niche step with an empty input. | onboarding |
| 🟠 | Parallel 401s each called `/auth/refresh` (rotation → second one fails → logout). | Single-flight refresh promise. | `lib/axios.ts` |
| 🟡 | Onboarding "selection" checkboxes did nothing; "Skip and continue" claimed the report was ready. | Honest list with Remove; accurate copy. | `CompetitorStep.tsx`, onboarding |
| 🟡 | `AuthInitializer` was a no-op; logout kept the query cache; inconsistent "onboarded" checks. | Bootstraps on non-dashboard routes; logout clears cache + Redux; one `isOnboarded`/`postAuthDestination` helper. | `providers/AuthInitializer.tsx`, `useLogout.ts`, `features/instagram/utils.ts` |
| 🟡 | Errors shown as empty states / "not found". | `PageErrorState` with retry; "not found" only on 404. | `components/shared/PageErrorState.tsx` |
| 🟡 | Growth chart showed "sync again" while loading; 5-min sync timeout never fired; report detail did a full reload; avatars fetched twice; `tw-animate-css` not imported; sync stage labels didn't match backend; `/videos` capped at 24. | Skeleton; real `setTimeout`; router navigation; React Query avatar cache; CSS import; stages 0–5/5–95/95–100; "Load more" with `offset`/`total`. | dashboard, report detail, `CompetitorAvatar.tsx`, `globals.css`, `jobProgressUtils.ts`, `videos/page.tsx` |
| 🟡 | Lint: 11 errors. | 0 errors: four effects converted to derived state, one scoped exception on onboarding's sticky-step effect, shadcn `ui/**` exempt from `no-explicit-any`. | `eslint.config.mjs` |
| 🟡 | Dead code and two lockfiles. | Duplicate report hooks, legacy roadmap hooks, `ui/spinner.tsx`, `package-lock.json` removed. | — |

### 2.6 Found by the end-to-end run (Nov 2026)
A full browser run (Playwright) against the real API, Celery workers, Postgres and Redis, with a local fake Instagram API (`IG_*_URL` overrides) and `AI_SIMULATION_MODE=true`, found these:

| Sev | Bug | Fix | Where |
|---|---|---|---|
| 🔴 | **Every timestamp was off by the viewer's UTC offset**: the API sends naive UTC (`2026-11-11T03:16:45`) and `new Date()` reads it as local time, so a fresh sync showed "8 hours ago" in UTC+8. | `parseApiDate()` treats offset-less values as UTC; used everywhere API dates are parsed. | `lib/utils.ts`, reports pages |
| 🟠 | **Onboarding showed "Competitor accounts found" over an empty list**: the last competitors poll could land just before the discovery task saved them, and polling stopped when the job finished. | Refetch competitors when discovery succeeds; the message only claims "found" when there are accounts. | `app/onboarding/page.tsx` |
| 🟠 | **Reconnecting an expired account dropped the user into onboarding** and did not resync, so "Sync failed" stayed up until the next daily run. | Callback returns `reconnected` for an onboarded account, queues a sync and redirects to `/dashboard?reconnected=true`; the dashboard follows any active sync job, not only ones it started. | `instagram_service.py`, `endpoints/instagram.py`, dashboard |
| 🟠 | **Connecting a different Instagram account mixed its data with the old account's** Reels, competitors and reports. | A different `instagram_user_id` purges the old data first. | `handle_oauth_callback_service` |
| 🟠 | Any text was accepted as a competitor handle (`@Bad Handle!` was saved and scraped). | `normalize_handle()`: lowercase, `@`/profile URL stripped, `[a-z0-9._]{1,30}`; 422 with a clear message. | `utils/instagram_handle.py`, `competitor_schema.py` |
| 🟠 | A manually added competitor got another account's profile (followers, name) because the profile refresh took `profiles[0]` without checking the handle. | Use the row whose handle matches (or the only row of a by-URL scrape). | `_refresh_competitor_profiles` |
| 🟡 | The same Reel showed 13.7% engagement in the list and 11% on its page (interactions/reach vs. a frozen interactions/views score). | Detail page uses interactions/reach from the latest sync, like everywhere else. | `videos/[id]/page.tsx` |
| 🟡 | First sync showed "+100%" on every stat (no previous sync to compare). | "New" when there is no baseline. | `dashboard_service._format_percent_change`, dashboard |
| 🟡 | "New Analysis" without a connected account sent a request that 400'd silently. | Shows "Connect Instagram" instead. | dashboard |
| 🟡 | After verifying email, "Go to dashboard" skipped onboarding; "Read the report" opened the list instead of the new report. | "Continue setup" → `/onboarding` until onboarded; opens `/reports/{newest id}`. | `VerifyEmailStatus.tsx`, onboarding |
| 🟡 | `next build` downloaded the Geist fonts from Google Fonts at build time, and failed whenever that request failed (on this machine, Node tried IPv6 first). Any network blip broke CI or a Vercel deploy. | Self-hosted with the `geist` package: font files ship in `node_modules`, no build-time network call. | `app/layout.tsx` |
| ⚪ | No favicon (404 on every page). | `app/icon.svg`. | — |


### 2.7 Missing features now built
Password reset, email verification (soft — banner, not a block), change password, delete account, daily auto-sync, Instagram token auto-refresh + reconnect banner, PDF export (browser print), tests + CI. See `PRD.md`.

---

## 3. Still open

| Sev | Issue | Notes |
|---|---|---|
| 🟠 | Real-mode paths for Instagram, Gemini, AssemblyAI and Bright Data were **not exercised** after the changes (no real keys locally). | Only simulation mode, unit tests and integration tests ran. Test against real services before relaunch. |
| 🟠 | Third-party cookies (`*.vercel.app` → `*.onrender.com`) can be blocked by Safari ITP / Chrome. | Use same-site custom domains (`app.example.com` + `api.example.com`). |
| 🟡 | Access JWTs stay valid up to `ACCESS_TOKEN_EXPIRE_MINUTES` after logout/reset/password change on *other* devices. | Stateless trade-off; fix would be a per-request session check. |
| 🟡 | Report trigger is check-then-insert (two simultaneous clicks could create two jobs). | Partial unique index or Redis lock. |
| 🟡 | Manual "add competitor" has no job row, so no progress UI. | |
| 🟡 | `NullPool` → new DB connection per request; httpx clients not reused. | Latency trade-off for PgBouncer compatibility. |
| 🟡 | Schema typos (`competitior_media`, `recommedation_type`) and `media_metrics.comments` as string. | Kept for API compatibility. |
| 🟡 | Unused npm deps (`radix-ui`, `class-variance-authority`). | |
| 🟡 | No 2FA, no Sentry/metrics, no product analytics. | |
| 🟡 | `worker.sh` split mode runs two Celery processes (~2× RAM). | Use `WORKER_MODE=single` on a 512 MB instance. |

---

## 4. Revival checklist — why it's probably down right now (Nov 2026)

| # | Thing | Why it's likely broken | What to do |
|---|---|---|---|
| 1 | `.env` files | Not in git, local folder was deleted | Copy `backend/.env.example` / `frontend/.env.example` (now tracked) and fill in (Render dashboard may still hold prod values) |
| 2 | Supabase project | Free projects **pause after ~1 week idle** and can be deleted after long inactivity | Restore/unpause or create a new project and run migrations |
| 3 | Render services | Free services spin down; free Redis instances expire; payment may have lapsed | Check dashboard, recreate Redis, redeploy |
| 4 | Instagram tokens | Long-lived tokens expire after **60 days**; existing ones are long dead | Users reconnect (the app now shows a reconnect banner; new tokens auto-refresh) |
| 5 | Meta app | Re-verification, data-use checkup, test users, API version deprecations | Check Meta developer dashboard; confirm insight metric names |
| 6 | Gemini model | `gemini-2.5-flash` may be renamed/retired; free-tier limits change | Set `AI_MODEL_FLASH` to a current model; re-check quotas |
| 7 | Dependencies | Pinned versions may break against current APIs | Upgrade carefully; CI now catches regressions |
| 8 | Bright Data dataset IDs | Hard-coded `gd_...` IDs may change; credits may be expired | Verify in Bright Data dashboard |
| 9 | AssemblyAI | Key/credits | Verify |
| 10 | Vercel + email | `NEXT_PUBLIC_API_URL` must point at the new API; CORS must include the Vercel URL; `SMTP_*` needed for reset/verify emails in production | Update both sides |
| 11 | Migration `c3d4e5f6a7b8` | Revokes all existing refresh sessions | Everyone logs in once after deploy (expected) |

Suggested order: local with `AI_SIMULATION_MODE=true` → real Meta OAuth through a tunnel → real Gemini → real AssemblyAI → real Bright Data → deploy.

---

## 5. Next

1. Run every real-mode integration (Meta, Gemini, AssemblyAI, Bright Data) once and fix what's changed upstream.
2. Same-site custom domains for frontend + API.
3. Unique-active-job constraint for report/sync triggers.
4. Job row + progress for manual competitor adds.
5. Sentry + basic metrics (job durations, failure rates, Gemini usage).

# Reelysis — Interview Prep (Software Engineering Intern)

> How to talk about this project in an interview: a 30-second pitch, a 2-minute walkthrough, plain-English + technical explanations of every major piece, likely questions with model answers, and honest "what I'd do differently".

---

## 1. The 30-second pitch

> "Reelysis is a full-stack web app I built solo that helps Instagram creators understand why their Reels perform the way they do. You connect your Instagram through Meta's official OAuth, it imports your Reels and their metrics, uses Gemini to detect your niche and suggest competitors, verifies those competitors with a scraping API, transcribes videos with AssemblyAI, and then has Gemini compare you against them and write a strategy report with a prioritised to-do list. It's Next.js on Vercel, FastAPI plus a Celery worker on Render, Postgres on Supabase and Redis. The interesting engineering was making slow, rate-limited third-party APIs feel reliable: background jobs with progress polling and heartbeats, a Redis-based AI budget, and recovery for stuck jobs. A year later I audited my own code, found real bugs — including a refresh-token check that silently didn't work because of bcrypt's 72-byte limit — fixed them, and added 46 tests and CI."

## 2. The 2-minute walkthrough (draw this on a whiteboard)

```
Browser (Next.js) ──cookies──> FastAPI ──> Postgres
                                  │  └──> Redis (queue + cache + rate limits)
                                  └─ send_task ─> Celery: "default" queue (sync, discovery, reports, + daily scheduler)
                                                         "slow" queue (transcription, scraping) ──> Instagram / Gemini / AssemblyAI / Bright Data
                       ◄──── poll GET /jobs/{id} every 3s ────┘ (workers write progress + heartbeat into Postgres)
```

1. **Frontend** — Next.js App Router, React Query for server state (with polling), Redux for tiny client state, axios with cookies.
2. **API** — FastAPI, layered endpoints → services → SQLModel models. Auth is JWT in HttpOnly cookies with per-device refresh sessions and rotation, plus password reset, email verification, change password and account deletion.
3. **Anything slow becomes a job** — the API inserts a row in `analysis_jobs`, pushes a Celery task to Redis and returns a `job_id` immediately. The worker updates `progress` (and a heartbeat) as it goes; the UI polls and shows a checklist. Slow work (transcription, scraping) has its own queue so it never blocks a user's report. A scheduler re-syncs every account daily and renews Instagram tokens before they expire.
4. **AI pipeline** — transcribe (AssemblyAI) → analyse each video with Gemini using a JSON schema → aggregate → Gemini writes the report.
5. **Cost control** — Gemini free tier is 20 calls/day and 5/minute, so I built a Redis counter budget and a per-minute throttle, and capped how many videos a report analyses.

---

## 3. Explain-it-simply / explain-it-technically

### 3.1 Why a background worker?
- **Simple:** Some tasks take minutes (scraping competitors can take 10). You can't make a web page wait that long, so the server hands the work to a helper and gives you a ticket number to check on.
- **Technical:** HTTP requests should be short-lived; long requests tie up server workers, hit proxy timeouts (Render/Vercel), and can't survive a restart. Celery + Redis gives a durable queue; the `analysis_jobs` table is the status record the client polls.

### 3.2 Why poll instead of WebSockets?
- **Simple:** Asking "done yet?" every 3 seconds is easy and works everywhere.
- **Technical:** Polling is stateless and works through any proxy/load balancer and serverless frontend; React Query's `refetchInterval` as a function makes it start/stop automatically based on job status. Trade-off: extra requests and up to one interval of latency. At scale I'd move to Server-Sent Events.

### 3.3 Authentication
- **Simple:** When you log in you get two tickets in cookies JavaScript can't read. A short-lived one for every request, and a 30-day one used only to get new short ones. Each long ticket works once.
- **Technical:** Access + refresh JWTs (HS256) in `HttpOnly` cookies (`Secure; SameSite=None` in prod because frontend and API are on different domains). Each device gets an `auth_sessions` row; its id is the `sid` claim in the refresh JWT, and the row stores a SHA-256 of the token. Refresh rotates the row; replaying an old token later than 30 s revokes every session (theft detection). Passwords are bcrypt-hashed off the event loop. Reset/verify links are random single-use tokens stored as SHA-256. Auth endpoints are rate-limited with slowapi + Redis, and an Origin check blocks cross-site POSTs (CSRF).
- **Why cookies, not localStorage?** localStorage is readable by any script → one XSS bug leaks the token. HttpOnly cookies can't be read by JS. The trade-off is CSRF exposure and cross-site cookie configuration.

### 3.4 OAuth with Instagram
- **Simple:** We never see your Instagram password. Instagram asks you "allow Reelysis?", then gives us a one-time code, which we swap for an access key.
- **Technical:** Authorization-code flow. A random `state` is saved in Redis (10 min TTL) mapped to the user — it prevents CSRF and tells the callback which user it belongs to. Code → short-lived token → long-lived (~60-day) token. The token is Fernet-encrypted at rest (encrypted, not hashed, because we need it back to call the API).

### 3.5 The AI pipeline
- **Simple:** We turn each video's speech into text, ask the AI to grade the hook and describe the content, then ask it to compare you with competitors and write a plan.
- **Technical:** AssemblyAI is given the media URL directly (server never downloads video). Gemini is called with `response_mime_type="application/json"` and `response_schema=<Pydantic model>` so the output is structured and parsed straight into typed objects (`VideoAnalysisResponse`, `StrategicReportResponse`). Scores are normalised to 0–100; confidence is capped when there's no transcript.

### 3.6 Staying inside the free tier
- **Simple:** The AI only allows 20 questions a day and 5 a minute, so I built a counter that says "no" before we hit the limit and makes calls wait their turn.
- **Technical:** `INCR gemini_usage:<date>` (atomic) with `DECR` on overflow; a fixed-window `gemini_rpm:<minute>` counter that sleeps into the next window; retry with backoff on per-minute 429s and 503s, but fail fast on the per-day 429 (distinguished by `PerDay` vs `PerMinute` in the error). One call is reserved for the final report so analysis can't starve it.

### 3.7 Finding competitors
- **Simple:** There's no Instagram feature for "show me similar creators", so I ask the AI for names and then check each one is real and big enough using a data-scraping service.
- **Technical:** Gemini suggests 15 handles (cached 7 days in Redis) → Bright Data async snapshot (trigger, then poll; 202 = not ready) → normalise inconsistent fields (`"12.5k"` → 12500) → quality bar ≥10k followers & ≥20 posts → keep manual competitors, replace auto ones → fetch 5 reels for the top 5 in a follow-up task.

### 3.8 Database design highlights
- Metrics are **append-only snapshots** (new row per sync) → enables growth charts and "% vs last sync".
- `video_analysis` is a **polymorphic** table (own vs competitor, two nullable FKs + an enum).
- Job state lives in Postgres, not just Celery, so it survives restarts and can be ownership-checked.
- Every query filters by `user_id` (tenant isolation).

### 3.9 Deploying to Supabase from Render (great debugging story)
- Render couldn't reach Supabase's direct host (IPv6-only) → used the IPv4 **session pooler**.
- asyncpg + PgBouncer → `DuplicatePreparedStatementError` → disabled statement caches, `NullPool`.
- Wrong driver picked from `postgresql://` → URL normaliser to `+asyncpg` / `+psycopg`.
- asyncpg rejects `sslmode` in the URL → moved SSL into an `SSLContext`.

### 3.10 Stuck jobs
- **Simple:** If the helper crashes halfway, the ticket would say "working…" forever. So every time the helper updates progress it also says "still alive". When someone checks a ticket, the server asks "has the helper been silent for 15 minutes?" and only then marks it failed.
- **Technical:** Workers call `set_progress`, which also bumps `updated_at` (a heartbeat); long inline steps call `heartbeat_sync` per item. Reconcilers run on read: running + no heartbeat for 15 min → failed; queued for 30 min → failed; a queued sync can be re-dispatched up to 3 times, 2 min apart. Workers only start jobs that are still `queued`, so re-dispatch is safe. Failures `rollback()` first so an aborted transaction doesn't block the status update. (v1 used time-since-start, which failed slow-but-healthy jobs — see §6.)

---

## 4. Likely interview questions & model answers

**Q: What was the hardest bug?**
A: Two good ones. (1) In production, report jobs stuck at "running, 0%": a DB error left the session in an aborted transaction, so writing `status=failed` also failed. Fix: `rollback()` first, an early progress signal, and reconcilers. (2) A year later, auditing my own code: refresh-token revocation never actually worked. I stored bcrypt hashes of refresh JWTs, but bcrypt only looks at the first 72 bytes, and every refresh JWT for a user starts with the same >72 bytes (JWT header + email). So *any* refresh token for that user matched *any* session — rotation and logout did nothing. Fix: put a session id in the token, look the session up directly and compare a SHA-256 of the whole token; I wrote a test that a rotated-out token is rejected.

**Q: How do you make sure a user can't see another user's data?**
A: Every query filters by `user_id` from the JWT; endpoints that take an ID (job, report, competitor, video) check ownership and return 404/403. Tokens are signed so the `id` claim can't be forged without the secret.

**Q: What happens if two requests try to start a report at the same time?**
A: The trigger checks for an active report job and returns it instead of creating a new one. It's still check-then-insert without a lock, so two truly simultaneous requests could both create jobs (an open item). A partial unique index on `(user_id, job_type) WHERE status IN ('queued','running')` or a Redis lock would close that gap. The worker side is already safe: it only starts jobs that are still `queued`.

**Q: Why FastAPI?**
A: Async I/O suits an app that mostly waits on databases and HTTP APIs; Pydantic gives request/response validation and the OpenAPI docs for free; dependency injection makes auth and DB sessions clean (`Annotated[..., Depends(...)]`).

**Q: Why both React Query and Redux?**
A: Different kinds of state. React Query is a server-state cache (fetching, caching, dedupe, polling, invalidation). Redux holds a tiny bit of client state (auth flag, sidebar). Most data never touches Redux.

**Q: How would you scale this to 10,000 users?**
A: Some of this is done: separate queues, indexes, no N+1 queries, a daily scheduler that spreads syncs (25 per hour). Next: (1) more worker processes per queue; (2) per-user AI budgets and a paid tier; (3) a real connection pool instead of `NullPool`; (4) SSE instead of polling; (5) observability — Sentry, structured logs, metrics on job durations and failure rates.

**Q: How did you handle unreliable third-party APIs?**
A: Timeouts on every HTTP client, retries with backoff only for transient errors, fail-fast for permanent ones (daily quota), caching of expensive results (Gemini handles, avatars), fallbacks (existing handles if Gemini fails), and a simulation mode so development doesn't depend on them.

**Q: What's the difference between hashing and encryption? Where did you use each?**
A: Hashing is one-way (bcrypt for passwords and refresh tokens — we only need to verify). Encryption is reversible with a key (Fernet for the Instagram token — we need the original to call the API).

**Q: How do you test this?**
A: v1 had none — that was a real gap. I added 46 backend tests: unit tests for pure functions (token decoding, password rules, scoring, URL normalisation, proxy-aware IPs, metric parsing) and integration tests that run the real FastAPI app against a real Postgres and Redis in Docker, through the real Alembic migrations — signup, refresh rotation, multi-device logout, password reset, CSRF, job reconciliation, pagination, the scheduler. CI runs them plus frontend typecheck, lint and build on every push. Writing them found a bug on day one (negative AI scores became −50). What's still not automated: the real Instagram/Gemini/AssemblyAI/Bright Data calls — I'd add recorded-response tests and a Playwright happy path.

**Q: What would you change in the architecture?**
A: Tests and CI from day one (I added them later). Heartbeats from the start instead of start-time timeouts (fixed now). Same-site deployment (`app.` + `api.` on one domain) to avoid third-party cookie blocking — still open. Per-request session checks if instant revocation of access tokens mattered.

---

## 5. STAR stories to prepare

1. **Supabase + Render connectivity** — S: deploy failed with `Network is unreachable` then `DuplicatePreparedStatementError`. T: get production DB working on free tier. A: diagnosed IPv6 vs IPv4, moved to pooler, learned PgBouncer transaction mode breaks prepared statements, wrote a URL normaliser. R: stable prod DB; documented trade-off (slower connections).
2. **Gemini free-tier limits** — S: reports failed halfway with 429s. T: make a report finish reliably within 20 calls/day. A: Redis budget counter + RPM throttle, reserve for final call, cap videos analysed, distinguish daily vs per-minute errors. R: reports complete or fail fast with a clear message.
3. **LLM hallucinated competitors** — S: Gemini suggested fake or YouTube-only accounts. A: treat the LLM as a *suggester*, verify with real data, quality bar, ask for more than needed. R: only real, relevant competitors shown.
4. **Instagram CDN blocking images** — A: server-side proxy with host allow-list and Redis cache, prefetching while URLs are still valid.
5. **Auditing my own code a year later** — S: came back to the project, docs lost, app offline. T: understand it again and make it production-worthy. A: read every file, wrote docs, listed every issue by severity, fixed them with regression tests, added CI. R: found and fixed a silent auth flaw (bcrypt 72-byte truncation), job-timeout races, head-of-line blocking, a page-crashing error render, and silenced logs; 46 tests green.

---

## 6. Bugs I found and fixed in my own code a year later

These make great answers to "tell me about a bug you found" — each has a cause, a fix and a test. Details in `CHALLENGES_AND_KNOWN_ISSUES.md §2`.

| Bug | Why it happened | Fix |
|---|---|---|
| **Refresh-token revocation silently didn't work** | bcrypt only reads 72 bytes; every refresh JWT for a user shares a longer prefix (header + email), so any of that user's tokens matched any session | Session id (`sid`) in the JWT, direct lookup, SHA-256 of the full token, reuse detection; test proves an old token is rejected |
| **Live jobs marked failed, then flipped to succeeded** | "Stuck" was judged by time since start (2 min sync, 10 min report) — shorter than a real slow run | Heartbeats: progress updates bump `updated_at`; fail only after 15 min of silence; workers only start `queued` jobs |
| **Reports failed while waiting in line** | One worker process: a transcription batch (minutes per video) sat in front of the report, which then timed out "before starting" | Two Celery queues (`default`, `slow`), one process each |
| **Second background task in a worker crashed** ("Future attached to a different loop") | Each Celery task ran `asyncio.run()` (a new event loop) but reused pooled DB connections created on the previous loop; production hid it with `NullPool` | `run_async_task()` disposes the async engine's pool before each loop closes; reproduced first, then 3 tasks in a row succeed |
| **Sync re-dispatched on every poll** | Reconciler re-sent the task whenever a queued sync was >15 s old, every 2–3 s | At most 3 re-sends, 2 min apart |
| **Signup page crashed on bad input** | FastAPI 422 `detail` is a list of objects; React can't render objects | One `getApiErrorMessage()` helper used everywhere |
| **All app logs vanished after startup** | Running Alembic inside the API called `fileConfig()`, which disables existing loggers and sets root to WARNING | `disable_existing_loggers=False` + explicit app logger level |
| **Secrets in logs** | Debug `print`s of the OAuth code and token response | Removed; only status codes logged |
| **Invalid tokens → 500** | Decoded with PyJWT but caught python-jose's exception class | One `decode_token()` that maps every JWT error to 401 |
| **Report brief always "winning"** | Thresholds 8/7 on a 0–100 scale | 80/70 constants + test |

What's still honestly open: real-mode third-party calls weren't re-tested (no keys locally), third-party cookies across `vercel.app`/`onrender.com`, access tokens valid until expiry after revocation, a rare double-trigger race, no 2FA, no Sentry/metrics. Framing: *"Here's what I found, how I proved it, how I fixed it, and what I'd do next."*

---

## 7. Glossary (quick definitions you should be able to say out loud)

| Term | One-liner |
|---|---|
| JWT | Signed JSON token; server verifies signature instead of looking up a session |
| HttpOnly cookie | Cookie JS can't read; sent automatically by the browser |
| SameSite | Cookie rule for cross-site requests (`Lax`, `Strict`, `None` + `Secure`) |
| CORS | Browser rule for which origins may call your API; needs explicit origins with credentials |
| CSRF | Another site making your browser send authenticated requests |
| OAuth 2.0 code flow | Redirect user to provider → get code → exchange for token server-side |
| Celery | Python distributed task queue; workers consume messages from a broker |
| Broker | Message transport between API and worker (Redis here) |
| Idempotent | Running it twice has the same effect as once |
| PgBouncer | Connection pooler; transaction mode shares server connections between clients |
| N+1 query | One query for a list + one per item; fix with joins/batching |
| Structured output | LLM constrained to a JSON schema |
| Rate limiting (fixed window) | Count requests per time bucket; reject/sleep over the limit |
| Fernet | Symmetric authenticated encryption (AES-CBC + HMAC) from `cryptography` |
| Alembic | SQLAlchemy migration tool; versioned schema changes |
| Heartbeat | A "still alive" timestamp a worker updates while working; staleness = time since last heartbeat |
| bcrypt vs SHA-256 | bcrypt: slow, salted, for low-entropy passwords (only reads 72 bytes). SHA-256: fast, fine for long random tokens |
| Token rotation / reuse detection | Each refresh issues a new token and kills the old one; seeing the old one again means it was stolen |
| CSRF origin check | Reject state-changing requests whose browser-set `Origin` isn't yours |

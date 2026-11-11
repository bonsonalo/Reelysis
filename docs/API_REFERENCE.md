# Reelysis — API Reference

> Source: `backend/app/api/v1/endpoints/*.py`. Base URL in dev: `http://localhost:8000`. Interactive docs: `/docs` (Swagger) and `/redoc`.
>
> **Auth model:** every endpoint except signup/login/refresh/logout, forgot/reset password, verify email and the OAuth callback requires the `access_token` **HttpOnly cookie**. There is no `Authorization: Bearer` header — the browser sends cookies automatically because axios uses `withCredentials: true`.
>
> **Errors:** `{"detail": "<message>"}`. `401` = not logged in / bad token, `403` = not your job or cross-site origin, `404` = not found *or not yours*, `422` = request body failed validation (`detail` is a list of `{loc, msg}`), `429` = rate-limited, `400` = validation / business rule, `500` = unexpected (generic message; details only in server logs).

Legend: 🔒 = needs auth cookie · ⏱ = rate-limited · ⚙️ = enqueues a background job and returns `job_id`

---

## 1. Auth — `/api/v1/auth`

| Method | Path | Body | Returns | Notes |
|---|---|---|---|---|
| POST | `/signup` ⏱ (5/hour/IP) | `{name, email, password}` | `User` + sets cookies | password must be >5 chars with upper, lower, digit, special; sends a verification email |
| POST | `/login` ⏱ (10/min/IP) | `{email, password}` | `User` + sets cookies | `401 Invalid email or password` |
| POST | `/refresh` ⏱ (30/min/IP) | — (reads `refresh_token` cookie) | `{message: "Token refreshed"}` + **new** cookies | rotates the session; `401 Invalid refresh token` |
| POST | `/logout` | — | `{message: "Logged out"}`, clears cookies | revokes the session in *this browser's* refresh cookie; no access cookie needed |
| GET | `/profile` 🔒 | — | `User` | used by the frontend to check "am I logged in?" |
| POST | `/password/forgot` ⏱ (5/hour/IP) | `{email}` | `{message}` — always the same text | emails a 30-min reset link if the account exists |
| POST | `/password/reset` ⏱ (10/min/IP) | `{token, password}` | `{message}`, clears cookies | revokes all sessions, marks email verified; `400` invalid/expired link or weak password |
| POST | `/password/change` 🔒 ⏱ | `{current_password, new_password}` | `{message}` + new cookies | other devices signed out; `400 Current password is incorrect.` |
| POST | `/email/verify` ⏱ (10/min/IP) | `{token}` | `{message, email_verified: true}` | works logged in or out; `400` invalid/expired/used link |
| POST | `/email/resend` 🔒 ⏱ (5/hour/user) | — | `{message}` | `400 Email is already verified.` |
| DELETE | `/account` 🔒 ⏱ | `{password}` | `{message}`, clears cookies | deletes the user and everything they own; `400 Password is incorrect.` |

`User` = `{"id", "name", "email", "email_verified": bool, "created_at": ISO string}`.

Emailed links point at the frontend: `{FRONTEND_URL}/reset-password?token=…` and `{FRONTEND_URL}/verify-email?token=…`. Without `SMTP_HOST`, development logs the email (with the link) to the API console instead.

Cookies set (`core/cookies.py`):

| Cookie | Lifetime | Flags (prod) | Flags (dev) |
|---|---|---|---|
| `access_token` | `ACCESS_TOKEN_EXPIRE_MINUTES` | HttpOnly, Secure, SameSite=None | HttpOnly, SameSite=Lax |
| `refresh_token` | 30 days | same | same |

JWT payloads: access `{"sub": email, "id": user_uuid, "token_type": "access", "exp"}`; refresh adds `"sid": <auth_sessions.id>` and `"token_type": "refresh"`.

---

## 2. Instagram — `/api/v1/instagram`

| Method | Path | Body / Query | Returns | Notes |
|---|---|---|---|---|
| GET | `/oauth/start` 🔒 | — | `{oauth_url}` | frontend does `window.location = oauth_url` |
| GET | `/oauth/callback` | `?code&state` or `?error` (from Instagram) | **302** → `{FRONTEND_URL}/onboarding?connected=true` (new or different account), `/dashboard?reconnected=true` (same onboarded account after its token expired; a sync is queued), or `…?connected=false&error=access_denied\|invalid_state\|connect_failed` | no cookie needed; `state` is looked up in Redis to find the user |
| GET | `/accounts` 🔒 | — | account list (0 or 1 item) | account fields + `token_expires_at` and `needs_reconnect` (token missing or expired) |
| DELETE | `/disconnect` 🔒 | — | `{message}` | **hard-deletes** account, token, media, competitors, analyses, reports, jobs |
| POST | `/sync` 🔒 ⏱ ⚙️ | — | `{message, job_id, status}` | returns the existing job if one is already queued/running; imports up to 50 videos/Reels |
| PATCH | `/niche/confirm` 🔒 ⏱ ⚙️ | `{niche}` | `{message, niche}` | saves niche **and** starts competitor discovery |
| PATCH | `/niche` 🔒 ⏱ | `{niche, trigger_discovery?: bool}` | `{message, niche_confirmed, niche_detected}` | settings page; optional re-discovery |
| POST | `/niche/detect` 🔒 ⏱ (10/hour) | — | `{niche_detected, niche_confirmed, biography, caption_count}` | Gemini call run in a worker thread (doesn't block other requests) |
| GET | `/media/{media_id}/thumbnail` 🔒 | — | **307** redirect to the Instagram CDN URL | ownership-checked |

---

## 3. Analysis / Dashboard — `/api/v1/analysis`

| Method | Path | Query | Returns |
|---|---|---|---|
| GET | `/jobs` 🔒 | `type` (job_type), `limit` (1–50) | `AnalysisJob[]` newest first; active jobs are reconciled |
| GET | `/jobs/{job_id}` 🔒 | — | `AnalysisJob` (`status`, `progress`, `error_message`, …). **This is the polling endpoint.** `403` if not yours |
| GET | `/dashboard/stats` 🔒 | — | `DashboardStats` |
| GET | `/dashboard/growth` 🔒 | — | `{data: [{date: "Mar 04", views, reach}]}` (last 30 days) |
| GET | `/dashboard/pillars` 🔒 | — | `{data: [{pillar, count, avg_engagement}]}` |
| GET | `/dashboard/videos` 🔒 | `limit` (1–100, default 6), `offset` (default 0) | `{data: VideoFeedItem[], total}` |
| GET | `/videos/{video_id}` 🔒 | — | `{media, analysis, metrics}` (each may be `null` except media) |
| GET | `/report/latest` 🔒 | — | `AccountReport` or `404` |
| GET | `/report/roadmap` 🔒 | — | `Recommendation[]` of the latest report, by priority desc |
| PATCH | `/report/roadmap/{recommendation_id}` 🔒 | — | `{id, status}` — **toggles** `pending` ↔ `completed` |

(The duplicate `POST /analysis/report/generate` was removed; use `POST /reports/generate`.)

`DashboardStats` shape:

```json
{
  "total_views": 12034,
  "avg_reach": 812,
  "avg_engagement": 6.4,
  "top_hook_score": 82,
  "top_analysis_confidence": 74,
  "views_change": "+12.5%",
  "reach_change": "-3%",
  "engagement_change": "+100%",
  "hook_change": "+5",
  "has_video_analysis": true
}
```

`VideoFeedItem`: `{id, thumbnail_url, caption, hook_score, views, engagement_rate, permalink, has_analysis}`.

---

## 4. Competitors — `/api/v1/competitors`

| Method | Path | Body | Returns | Notes |
|---|---|---|---|---|
| GET | `/` 🔒 | — | `CompetitorAccount[]` | |
| POST | `/` 🔒 | `{handle}` (`@name`, `name` or profile URL) | `CompetitorAccount` | manual add; max 10; handle lowercased and must match `[a-z0-9._]{1,30}` (else 422); enqueues profile + reels fetch (no job row returned) |
| POST | `/discover` 🔒 ⏱ ⚙️ | — | `{message, job_id}` | fresh Gemini suggestions, replaces auto-discovered (keeps manual) |
| GET | `/{competitor_id}` 🔒 | — | `CompetitorAccount` | |
| GET | `/{competitor_id}/avatar` 🔒 | — | image bytes (`Cache-Control: private, max-age=3600`) | server-side proxy because Instagram's CDN blocks hotlinking; cached in Redis 7 days |
| DELETE | `/{competitor_id}` 🔒 | — | `{message}` | cascades to that competitor's media + analyses |

---

## 5. Reports — `/api/v1/reports`

| Method | Path | Returns |
|---|---|---|
| GET | `/` 🔒 | `ReportListItem[]` — `{id, title, status, summary, created_at}` newest first |
| POST | `/generate` 🔒 ⏱ ⚙️ | `{message, job_id}` |
| GET | `/{report_id}` 🔒 | `ReportDetailResponse` — report + `recommendations[]` |

`ReportDetailResponse`:

```json
{
  "id": "uuid",
  "title": "Growth Strategy - March 2026",
  "status": "ready",
  "summary": "...",
  "report_markdown": "# ...",
  "report_json": {
    "summary": "...",
    "market_trends": ["..."],
    "competitor_strengths": ["..."],
    "user_gaps": ["..."],
    "user_advantages": ["..."],
    "roadmap": [{"title": "...", "description": "...", "priority": 5, "evidence": "...", "type": "hook"}],
    "report_markdown": "..."
  },
  "created_at": "...",
  "updated_at": "...",
  "recommendations": [
    {"id": "uuid", "title": "...", "description": "...", "recommedation_type": "hook", "priority": 5, "evidence": "...", "status": "pending"}
  ]
}
```

---

## 6. Job object (what you poll)

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "job_type": "report_generation",
  "status": "running",
  "progress": 58,
  "input_payload": {},
  "result_payload": {},
  "error_message": "",
  "retry_count": 0,
  "started_at": "2026-03-04T10:00:00",
  "completed_at": "1970-01-01T00:00:00",
  "created_at": "...",
  "updated_at": "..."
}
```

`completed_at`/`started_at` equal to 1970-01-01 means "not set yet". `updated_at` is the worker's heartbeat; a running job with no heartbeat for 15 minutes (or a job queued for 30) is marked failed when read. `retry_count` counts re-dispatches of a queued sync.

---

## 7. CSRF origin check

`POST`/`PUT`/`PATCH`/`DELETE` requests that carry an `Origin` (or `Referer`) not in the allowed list (`CORS_ORIGINS` or `FRONTEND_URL`, plus localhost in development, plus the API's own origin) get `403 {"detail": "Origin not allowed"}`. Requests with neither header (curl, server-to-server) are allowed. See `core/middleware.py`.

## 8. Rate-limit keys

- Auth endpoints → keyed by client IP, taken from `X-Forwarded-For` counting `TRUSTED_PROXY_HOPS` entries from the right (Render = 1).
- Job/AI triggers → keyed by `user:{id}` decoded from the access-token cookie, falling back to IP.
- Storage: Redis (`RATE_LIMIT_STORAGE=redis`). Exceeding returns `429 {"detail": "Too many requests. Please wait and try again."}`.

Endpoint count: 39 routes (11 auth, 9 instagram, 10 analysis, 6 competitors, 3 reports).

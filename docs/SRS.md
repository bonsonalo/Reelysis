# Reelysis — Software Requirements Specification (SRS)

> Companion to `PRD.md`. The PRD says *what* and *why*; this says *exactly how the system must behave*. Each requirement is traced to the code that implements it. Status (Nov 2026, after the fix pass): ✅ implemented · ⚠️ partial / known limitation · ❌ not implemented. 🧪 = covered by an automated test in `backend/tests`.

---

## 1. Introduction

### 1.1 Purpose
Defines the functional and non-functional requirements of Reelysis so that the system can be rebuilt, tested and extended.

### 1.2 Scope
A web application with:
- a Next.js frontend,
- a FastAPI REST API,
- Celery workers (two queues + beat scheduler) for long-running and scheduled jobs,
- PostgreSQL + Redis,
- integrations with Instagram Graph API, Google Gemini, AssemblyAI, Bright Data and an SMTP server.

### 1.3 Definitions
| Term | Meaning |
|---|---|
| Reel / media item | One Instagram video imported from the user's account (`media_items`) |
| Snapshot | One row of metrics for a media item captured at sync time (`media_metrics`) |
| Job | A row in `analysis_jobs` tracking a background task |
| Heartbeat | `analysis_jobs.updated_at`, bumped by the worker whenever it reports progress |
| Niche | Short label of the creator's content area, e.g. "Tech Education" |
| Hook score | 0–100 AI rating of the first 1–3 seconds / first line |
| Content pillar | Recurring content theme (e.g. "How-to") |
| Reconciler | Code that runs when a job is read and fails jobs whose worker is gone |
| Simulation mode | `AI_SIMULATION_MODE=true` — Gemini, AssemblyAI and Bright Data are mocked |
| User token | Single-use emailed token (password reset / email verification), stored as SHA-256 |

---

## 2. Overall description

### 2.1 User classes
- **Visitor** — not logged in; can see landing, login, register, forgot/reset password, verify email, privacy, terms.
- **Registered user** — logged in, no Instagram connected; sent to onboarding.
- **Connected user** — Instagram connected; full dashboard.

There is no admin role.

### 2.2 Operating environment
- Modern evergreen browsers (cross-site cookies must be allowed in prod while frontend and API are on different sites).
- Backend: Python 3.12, Linux container (Render).
- Postgres 14+ (Supabase), Redis 6+.

### 2.3 Design constraints
- Only Instagram **Business/Creator** accounts (Meta API restriction).
- Gemini free tier: 20 requests/day, 5/min (configurable).
- Render memory: 512 MB on small instances (`WORKER_MODE=single` there).

---

## 3. Functional requirements

### 3.1 Authentication & account (FR-AUTH)
| ID | Requirement | Status | Code |
|---|---|---|---|
| FR-AUTH-1 | Register a user with name, unique email, password. | ✅ 🧪 | `auth_service.register_user` |
| FR-AUTH-2 | Password >5 chars with upper, lower, digit and one of ``!@#$%^&*(){}/'.,``. | ✅ 🧪 | `utils/password_strength.py` |
| FR-AUTH-3 | Passwords stored as bcrypt hashes; hashing runs off the event loop. | ✅ | `auth_service.hash_password/verify_password` |
| FR-AUTH-4 | Signup/login set `access_token` and `refresh_token` HttpOnly cookies and return `{id, name, email, email_verified, created_at}`. | ✅ 🧪 | `core/cookies.py`, `auth_service.user_payload` |
| FR-AUTH-5 | Access token lifetime = `ACCESS_TOKEN_EXPIRE_MINUTES`; refresh = 30 days. | ✅ | `auth_service.py` |
| FR-AUTH-6 | Refresh JWT carries a session id (`sid`); refresh looks up that session and compares a SHA-256 hash of the full token; rotates (revokes old, issues new). | ✅ 🧪 | `auth_service.refresh_token_service` |
| FR-AUTH-7 | Reuse of a rotated refresh token later than 30 s after rotation revokes all of the user's sessions. | ✅ | same |
| FR-AUTH-8 | Sessions are per device: refreshing or logging out on one device does not affect another. | ✅ 🧪 | `_issue_session`, `logout_service` |
| FR-AUTH-9 | Logout revokes this browser's session (from the refresh cookie) and clears cookies; no access cookie required. | ✅ 🧪 | `logout_service` |
| FR-AUTH-10 | Protected endpoints return 401 on missing/invalid/expired tokens (never 500). | ✅ 🧪 | `api/dep.decode_token`, `get_current_user` |
| FR-AUTH-11 | Frontend retries a 401 once after a single shared `/auth/refresh` call, else redirects to `/login`. | ✅ | `frontend/src/lib/axios.ts` |
| FR-AUTH-12 | Forgot password always answers with the same message (no account enumeration); emails a 30-min single-use link; earlier unused links are invalidated. | ✅ 🧪 | `forgot_password_service` |
| FR-AUTH-13 | Reset password validates strength, consumes the token, revokes all sessions, clears this browser's cookies, and marks the email verified. | ✅ 🧪 | `reset_password_service`, `endpoints/auth.reset_password` |
| FR-AUTH-14 | Signup sends a 48-h verification link; verify works logged in or out; resend invalidates the previous link; already-verified → 400. | ✅ 🧪 | `verify_email_service`, `resend_verification_service` |
| FR-AUTH-15 | Unverified users see a banner with "Resend email" (verification is not required to use the app). | ✅ | `EmailVerificationBanner.tsx` |
| FR-AUTH-16 | Change password requires the current password, revokes other sessions, keeps this device signed in. | ✅ 🧪 | `change_password_service` |
| FR-AUTH-17 | Delete account requires the password and deletes the user and all owned data (DB cascades). | ✅ 🧪 | `delete_account_service` |
| FR-AUTH-18 | Rate limits: signup 5/h/IP; login, reset, verify 10/min; refresh 30/min/IP; forgot + resend 5/h. | ✅ | `core/rate_limit.py`, `endpoints/auth.py` |
| FR-AUTH-19 | Two-factor authentication. | ❌ | — |

### 3.2 Instagram connection (FR-IG)
| ID | Requirement | Status | Code |
|---|---|---|---|
| FR-IG-1 | `GET /instagram/oauth/start` returns a URL-encoded authorize URL with a random `state`, stored in Redis for 600 s mapped to the user. | ✅ | `get_oauth_url_service`, `meta.get_oauth_url` |
| FR-IG-2 | The callback validates `state` (single use), exchanges code → short-lived → long-lived token, fetches the profile, upserts the account and Fernet-encrypted token, then 302 → `/onboarding?connected=true`. | ✅ | `handle_oauth_callback_service` |
| FR-IG-3 | On denial or failure the callback redirects to `/onboarding?connected=false&error=access_denied|invalid_state|connect_failed`; the frontend shows a friendly message. | ✅ 🧪 | `endpoints/instagram.oauth_callback`, `getOAuthErrorMessage` |
| FR-IG-4 | No OAuth code or token is ever logged. | ✅ | `meta.py` |
| FR-IG-5 | `GET /instagram/accounts` includes `token_expires_at` and `needs_reconnect`. | ✅ 🧪 | `get_connected_accounts_service` |
| FR-IG-6 | Disconnect permanently deletes recommendations, reports, analyses, media, competitor data, jobs, token and account. | ✅ | `purge_user_instagram_data_service` |

### 3.3 Sync (FR-SYNC)
| ID | Requirement | Status | Code |
|---|---|---|---|
| FR-SYNC-1 | `POST /instagram/sync` creates a `queued` job and dispatches the task, unless a sync is already active (then returns it). | ✅ | `trigger_instagram_sync_service` |
| FR-SYNC-2 | The task only starts `queued` jobs (duplicates and reconciler-failed jobs are skipped). | ✅ | `job_utils.job_should_start` |
| FR-SYNC-3 | Refresh the token first if it expires within `IG_TOKEN_REFRESH_DAYS_BEFORE_EXPIRY` days. | ✅ | `refresh_token_if_expiring` |
| FR-SYNC-4 | Refresh profile fields; progress 5. | ✅ | `_sync_instagram_data_internal` |
| FR-SYNC-5 | Fetch media following pagination up to `SYNC_MAX_MEDIA` (50); keep only videos/Reels; delete previously imported non-video rows. | ✅ 🧪 (filter) | `meta.get_user_media`, `_is_syncable` |
| FR-SYNC-6 | Per item: upsert `media_items` by `(user_id, external_media_id)`, parse hashtags, insert a metrics snapshot; progress 5→95. | ✅ | same |
| FR-SYNC-7 | If the niche isn't confirmed, run AI niche detection (fallback "Uncategorized"); progress 95→100. | ✅ | same |
| FR-SYNC-8 | On success set `last_synced_at` and enqueue a transcription job (slow queue). | ✅ | same |
| FR-SYNC-9 | An expired/revoked token (Meta error 190/102) fails the job with "Instagram access expired…" and marks the token expired → `needs_reconnect`. | ✅ | `InstagramAuthError`, `mark_token_invalid` |
| FR-SYNC-10 | Automatic sync: hourly, queue up to 25 accounts last synced more than `AUTO_SYNC_INTERVAL_HOURS` ago with a valid token, skipping users with an active sync. | ✅ 🧪 | `scheduled_service.enqueue_due_syncs_task` |
| FR-SYNC-11 | Token refresh: daily at 03:00 UTC, refresh tokens expiring within 10 days; invalid ones flagged for reconnect. | ✅ | `scheduled_service.refresh_expiring_tokens_task` |

### 3.4 Niche (FR-NICHE)
| ID | Requirement | Status | Code |
|---|---|---|---|
| FR-NICHE-1 | Gemini detects the niche from bio, up to 20 captions and top 20 hashtags. | ✅ | `ai_service.detect_niche_service_sync` |
| FR-NICHE-2 | `PATCH /niche/confirm` saves the niche and starts competitor discovery. | ✅ | `confirm_instagram_niche_service` |
| FR-NICHE-3 | `PATCH /niche` updates the niche and optionally re-runs discovery. | ✅ | `update_instagram_niche_service` |
| FR-NICHE-4 | `POST /niche/detect` re-runs detection in a thread (doesn't block the API). | ✅ | `detect_instagram_niche_service` |

### 3.5 Competitors (FR-COMP)
| ID | Requirement | Status | Code |
|---|---|---|---|
| FR-COMP-1 | Gemini suggests 15 handles (cached 7 days per niche+username unless refresh mode). | ✅ | `suggest_competitor_handles_sync` |
| FR-COMP-2 | If Gemini returns nothing, fall back to currently tracked handles. | ✅ | `social_data.search_creators_by_niche` |
| FR-COMP-3 | Bright Data profile snapshot polled with backoff up to ~10.5 min, heartbeating each attempt. | ✅ | `_poll_profile_snapshot` |
| FR-COMP-4 | Auto-discovered competitors replaced on each run; manual ones kept. | ✅ | `_purge_auto_discovered_competitors` |
| FR-COMP-5 | Save only suggested handles with ≥10,000 followers and ≥20 posts, by followers then engagement, up to 10 − manual. | ✅ | `_process_and_save_competitors` |
| FR-COMP-6 | Fetch up to 5 reels for the top 5 competitors (ordered by followers, engagement) on the slow queue; upsert by provider id or permalink; parse real publish date. | ✅ 🧪 (parsing) | `fetch_competitor_media_batch_task`, `_save_competitor_media` |
| FR-COMP-7 | Manual add: normalise handle, reject duplicates, max 10, fetch profile + reels in background. | ⚠️ no job row / progress | `add_competitor_by_handle_service` |
| FR-COMP-8 | Avatar proxy: allow-listed CDN hosts only; bytes cached 7 days in Redis; frontend caches per competitor. | ✅ | `utils/cdn_image.py`, `CompetitorAvatar.tsx` |
| FR-COMP-9 | Engagement stored in basis points, shown only for accounts ≥10k followers. | ✅ | `utils/competitor_metrics.py` |

### 3.6 Transcription (FR-TRANS)
| ID | Requirement | Status | Code |
|---|---|---|---|
| FR-TRANS-1 | Only `VIDEO`/`REEL` media without a real transcript are transcribed. | ✅ | `_collect_transcription_targets` |
| FR-TRANS-2 | AssemblyAI is given the media URL, polled every 3 s, timeout 300 s; the server never downloads video. | ✅ | `core/client/assemblyai.py` |
| FR-TRANS-3 | "No spoken audio" → empty transcript, not an error. | ✅ | `transcribe_media_url` |
| FR-TRANS-4 | Runs on the `slow` queue so it never delays sync/discovery/reports. | ✅ | `celery_app.task_routes` |

### 3.7 Video analysis (FR-VA)
| ID | Requirement | Status | Code |
|---|---|---|---|
| FR-VA-1 | Gemini returns schema-enforced `VideoAnalysisResponse` JSON. | ✅ | `ai_service.analyze_video_service` |
| FR-VA-2 | Scores normalised to 0–100 (negatives clamped); confidence ≤65 without a transcript. | ✅ 🧪 | `utils/scoring.py`, `_save_analysis` |
| FR-VA-3 | Only unanalysed videos; newest own (max 2) + highest-engagement competitor (max 3), within remaining budget minus reserve. | ✅ | `_select_videos_for_budget` |
| FR-VA-4 | A quota error marks the analysis job failed before propagating. | ✅ | `_run_analysis_internal` |

### 3.8 Dashboard (FR-DASH)
| ID | Requirement | Status | Code |
|---|---|---|---|
| FR-DASH-1 | Stats: total views (latest snapshots), avg reach, avg engagement (`Σinteractions / Σreach × 100`), top hook score + confidence. | ✅ 🧪 | `get_dashboard_stats_service` |
| FR-DASH-2 | Changes compare latest vs previous snapshot per reel. | ✅ | `_format_percent_change` |
| FR-DASH-3 | Growth: last 30 days, best snapshot per reel per day. | ✅ | `get_growth_chart_service` |
| FR-DASH-4 | Pillars: count + avg engagement per pillar (batched queries). | ✅ | `get_content_pillars_service` |
| FR-DASH-5 | Videos: newest first with `limit` (1–100) and `offset`, returning `total`; frontend "Load more". | ✅ 🧪 | `get_recent_videos_service`, `videos/page.tsx` |

### 3.9 Reports (FR-REP)
| ID | Requirement | Status | Code |
|---|---|---|---|
| FR-REP-1 | One active report job per user; a second request returns it. | ⚠️ check-then-insert (rare race) | `trigger_report_generation_service` |
| FR-REP-2 | Refresh competitor data first if stale (>7 days), missing media, or no competitor analysis. | ✅ | `competitor_data_needs_refresh` |
| FR-REP-3 | Transcribe, then analyse within budget, heartbeating per item; fail clearly if no budget and no prior analyses. | ✅ | `_generate_report_internal` |
| FR-REP-4 | Briefs: user (count, top topics, avg hook, dominant category); competitor (count, topics with hook ≥80, market avg hook, formats with hook ≥70). | ✅ 🧪 | `_prepare_*_brief` |
| FR-REP-5 | Save report + recommendations + job success in one transaction; UTC title. | ✅ | same |
| FR-REP-6 | Recommendations toggle pending ↔ completed by their owner. | ✅ | `PATCH /analysis/report/roadmap/{id}` |
| FR-REP-7 | Export to PDF via the browser print dialog with a print stylesheet. | ✅ | `reports/[id]/page.tsx`, `globals.css` |

### 3.10 Jobs (FR-JOB)
| ID | Requirement | Status | Code |
|---|---|---|---|
| FR-JOB-1 | Every progress update also bumps `updated_at` (heartbeat). | ✅ | `job_utils.set_progress` |
| FR-JOB-2 | Reading an active job reconciles it: queued > 30 min → failed; running with no heartbeat for 15 min → failed. | ✅ 🧪 | `job_utils.reconcile_job` |
| FR-JOB-3 | A queued sync whose message may be lost is re-dispatched at most 3 times, ≥2 min apart. | ✅ | same |
| FR-JOB-4 | All job types (including transcription and video analysis) are reconciled. | ✅ | `analysis_service._reconcile` |
| FR-JOB-5 | Another user's job → 403. | ✅ 🧪 | `get_job_status_service` |

### 3.11 Frontend behaviour (FR-UI)
| ID | Requirement | Status | Code |
|---|---|---|---|
| FR-UI-1 | Dashboard routes redirect to `/login` when `/auth/profile` fails. | ✅ (client-side) | `app/(dashboard)/layout.tsx` |
| FR-UI-2 | Onboarding derives its step from server state; auto-advances to COMPLETED; retry after a failed sync; discovery polling starts after niche confirm. | ✅ | `app/onboarding/page.tsx` |
| FR-UI-3 | Active jobs are polled every 2–3 s; polling stops on terminal status. | ✅ | React Query `refetchInterval` |
| FR-UI-4 | Progress mapped to stage checklists (sync 0–5 / 5–95 / 95–100). | ✅ | `jobProgressUtils.ts`, `reportGenerationProgress.ts` |
| FR-UI-5 | API errors (including FastAPI 422 arrays) are shown as readable text. | ✅ | `lib/utils.getApiErrorMessage` |
| FR-UI-6 | Query errors show an error state with retry; "not found" only on 404. | ✅ | `PageErrorState.tsx` |
| FR-UI-7 | Disconnect / delete account require explicit confirmation. | ✅ | `DisconnectInstagramDialog.tsx`, `DeleteAccountDialog.tsx` |
| FR-UI-8 | Reconnect banner when `needs_reconnect`. | ✅ | `ReconnectInstagramBanner.tsx` |
| FR-UI-9 | Logout and password reset clear the React Query cache and Redux auth. | ✅ | `useLogout.ts`, `useAccountSecurity.ts` |

---

## 4. Non-functional requirements

| ID | Category | Requirement | Status |
|---|---|---|---|
| NFR-1 | Performance | Non-job endpoints < 500 ms p95 | ⚠️ `NullPool` + remote DB still slow on free tier; bcrypt now off the event loop |
| NFR-2 | Performance | No request blocks the event loop on third-party calls | ✅ niche detect + bcrypt in threads |
| NFR-3 | Reliability | No job remains `queued`/`running` forever | ✅ reconcilers for every job type |
| NFR-4 | Reliability | A live job is not failed while it is still working | ✅ heartbeat-based (15 min of silence) |
| NFR-5 | Security | Tokens not accessible to JS; secrets hashed (bcrypt / SHA-256) or encrypted (Fernet) at rest | ✅ |
| NFR-6 | Security | No secrets in logs; generic 500 messages | ✅ |
| NFR-7 | Security | Per-user data isolation on every query | ✅ 🧪 |
| NFR-8 | Security | Cross-site state-changing requests rejected (Origin/Referer check) | ✅ 🧪 |
| NFR-9 | Security | Revoked sessions stop working immediately | ⚠️ refresh: immediately; access JWT: until it expires (≤ `ACCESS_TOKEN_EXPIRE_MINUTES`) |
| NFR-10 | Cost | Never exceed `GEMINI_DAILY_BUDGET`; fail closed without Redis | ✅ |
| NFR-11 | Privacy | User can delete Instagram data (disconnect) and their whole account | ✅ |
| NFR-12 | Maintainability | Automated tests and CI | ✅ 46 backend tests; CI runs pytest + tsc + lint + build |
| NFR-13 | Observability | Error tracking and metrics | ❌ logs only (INFO by default, `LOG_LEVEL`) |
| NFR-14 | Portability | Runs locally in simulation mode | ✅ |

---

## 5. External interface requirements

- **REST API** — see `API_REFERENCE.md`.
- **Instagram Graph API** — `instagram.com/oauth/authorize`, `api.instagram.com/oauth/access_token`, `graph.instagram.com/access_token` (exchange), `/refresh_access_token`, `/me`, `/me/media` (paginated), `/{media-id}/insights` (metrics `reach,views,likes,comments,saved,shares,total_interactions`, `period=lifetime`).
- **Gemini** — `client.models.generate_content(model, contents, config={"response_mime_type": "application/json", "response_schema": PydanticModel})`.
- **AssemblyAI** — `POST /v2/transcript {audio_url}`, `GET /v2/transcript/{id}`.
- **Bright Data** — `POST /datasets/v3/trigger?dataset_id=...&format=json&discover_by=url`, `GET /datasets/v3/snapshot/{id}?format=json` (202 = not ready). Profiles `gd_l1vikfch901nx3by4`, reels `gd_lyclm20il4r5helnj`.
- **SMTP** — any provider (`SMTP_HOST/PORT/USERNAME/PASSWORD/FROM/USE_TLS`); STARTTLS by default.

---

## 6. Acceptance scenarios

✅ = automated in `backend/tests/test_api.py` or `test_units.py`.

1. ✅ Weak passwords rejected with the specific rule.
2. ✅ Wrong password → 401.
3. ✅ Garbage / expired / wrong-type token → 401, not 500.
4. ✅ Refresh rotates; the old refresh token is rejected afterwards.
5. ✅ Two devices refresh independently; logging out one leaves the other working.
6. ✅ Verify-email link works once; resend invalidates the earlier link; resend when verified → 400.
7. ✅ Forgot password for an unknown email returns 200 and sends nothing.
8. ✅ Reset: weak password rejected; success revokes sessions; link can't be reused; new password logs in; email becomes verified.
9. ✅ Expired reset link → 400.
10. ✅ Change password: wrong current → 400; success keeps this device, signs out the other.
11. ✅ Delete account: wrong password → 400; success removes user and sessions.
12. ✅ POST with a foreign `Origin` → 403; allowed origin passes.
13. ✅ OAuth callback denial / unknown state → redirect back to onboarding with the error code.
14. ✅ Running job with a recent heartbeat stays running even if it started 40 min ago; one with no heartbeat is failed.
15. ✅ Another user's job → 403.
16. ✅ Dashboard videos paginate with `total`; stats sum latest views.
17. ✅ Protected routes require auth.
18. ✅ Scheduler queues a due account once and skips it while a sync is active; expired tokens are flagged and not auto-synced.
19. ✅ Unit: score normalisation, DB URL normalisation, proxy-aware client IP, insight parsing, Reels-only filter, competitor media parsing ("1.2k", dates), report thresholds, SHA-256 vs 72-byte prefix.
20. Manual (browser): signup → 422 message → verification → change password → forgot/reset → login → delete account.
21. Manual: full report through the real split workers in simulation mode.

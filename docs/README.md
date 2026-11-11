# Reelysis Documentation

Rebuilt in Nov 2026 by reading every source file, because the original docs were lost (`.gitignore` ignored `*.md`; `docs/` is now whitelisted — see `SETUP_AND_ENVIRONMENT.md §7`). Updated after the Nov 2026 fix pass: security and job-reliability fixes, password reset / email verification / change password / delete account, daily auto-sync and Instagram token refresh, PDF export, 46 backend tests and CI.

| Read this… | …to learn |
|---|---|
| [PRD.md](PRD.md) | What the product is, who it's for, the features, goals, metrics and risks |
| [SRS.md](SRS.md) | Exact functional and non-functional requirements, each traced to code with a status |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design, components, key decisions and trade-offs, security, scaling |
| [IMPLEMENTATION.md](IMPLEMENTATION.md) | A file-by-file walkthrough of how the backend and frontend work |
| [WORKFLOW.md](WORKFLOW.md) | Sequence and state diagrams for auth, OAuth, onboarding, sync, discovery, reports, jobs, password reset, email verification and the daily scheduler |
| [DATA_MODEL.md](DATA_MODEL.md) | Every table and column, ER diagram, migrations, indexes, Redis keys |
| [API_REFERENCE.md](API_REFERENCE.md) | All 39 endpoints with request and response shapes, CSRF and rate-limit rules |
| [SETUP_AND_ENVIRONMENT.md](SETUP_AND_ENVIRONMENT.md) | Every env var, the `.env.example` templates, running locally, running tests, deployment and worker modes |
| [CHALLENGES_AND_KNOWN_ISSUES.md](CHALLENGES_AND_KNOWN_ISSUES.md) | Problems solved in v1, bugs found and fixed in Nov 2026, what's still open, and why it's offline |
| [INTERVIEW_PREP.md](INTERVIEW_PREP.md) | Pitch, simple and technical explanations, likely questions with answers, STAR stories |

Suggested reading order for interview prep: PRD → ARCHITECTURE → WORKFLOW → INTERVIEW_PREP → CHALLENGES.

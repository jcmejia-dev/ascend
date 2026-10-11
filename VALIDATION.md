# Executed validation — October 11, 2026

Application: ASCEND 2.0.0, local-first PWA.

| Check | Executed result |
|---|---|
| `npm run typecheck` | Passed |
| `npm test` | **88 passed**, six test files |
| `npm run build` | Passed; static export and generated offline asset cache |
| `npm run test:e2e` | **44 passed**, desktop Chromium and Pixel 7 emulation |
| Account-switch guards | Final rebuild and account/concurrent-edit browser cases rerun on both viewports |
| `npm audit --omit=dev` | Zero known production dependency vulnerabilities reported |
| Visual inspection | Desktop and mobile academy and achievement layouts inspected |

The 20 original browser checks still cover courses, certificates and attachments, backup/restore, sessions, goals, practice, projects, roadmap, timer, themes, offline edits, replacement service workers and concurrent-tab edits. The 18 new checks cover career diagnostics and discovery integration, all 25 reference solutions in the real sandbox, lesson checkpoints, idempotent XP, adaptive recommendations, daily challenges, quizzes and arcade explanations, offline execution and drafts, calculator project fixtures, declared portfolio evidence and interview reflections.

Sandbox checks exercise network and storage confinement, forged messages, prototype changes and infinite-loop termination. Submitted JavaScript runs in a worker inside an opaque-origin iframe, never in the application context. Browsers do not provide a hard per-worker memory quota. Client-side question and test banks remain inspectable and are not secure professional examinations.

Automated axe checks cover the original tested screens and six learning views in light and dark themes at both viewports. Overflow checks and screenshots complement these checks; this is not a complete accessibility certification.

Unit tests cover evidence-based progression, XP provenance, duplicate prevention, reviews, badge rules, backup versions and legacy migration. Tutor proxy tests use a mocked upstream and check bounded loopback-only requests. No live Ollama response quality was tested.

Physical Android installation, deployed HTTPS behavior, notification permissions and long-term storage eviction require real-device validation. No Lighthouse score was measured. PHP/Python execution, native TypeScript compilation, remote repository grading, offline account synchronization and closed-app Web Push are not implemented.

Development test records exist only in isolated Playwright browser contexts. Tests do not populate or replace existing user records.


Account upgrade: registration/login/logout, normalized email and salted scrypt passwords, hashed server sessions with HttpOnly/SameSite cookies, HTTPS Secure cookie configuration, origin checks, throttling, authenticated workspace ownership, stale-write rejection, validated attachments and backup restoration. Unit cases also check session expiry and account changes during in-flight requests. Browser cases verify two users are isolated, the same account is accessible from a separate browser, logout refreshes another tab, and certificate files survive account backup/restore. Account test data uses a separate work database. Email verification/recovery and a public HTTPS deployment are not implemented/tested.

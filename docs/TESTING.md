# Validation record

Run the commands in the README to reproduce checks. `tests/model.test.ts` covers progress/completion, expiration boundaries, file signatures/limits, unsafe URLs, profiles/backups, timestamp timers, actual activity goals and streaks. `tests/storage.test.ts` exercises actual IndexedDB transactions through fake-indexeddb, including conflicting saves and backup imports.

Playwright runs the production app with Chromium and Pixel 7 emulation. Critical flows cover course CRUD/archive, lesson tracking, explicit completion, image/PDF attachments and downloads, attachment-inclusive backup restore, session/goal/practice/project/roadmap flows, profile/theme persistence, every primary route, horizontal overflow, WCAG AA axe checks, timestamp timer recovery, offline reload/edit persistence, and actual replacement-worker update detection.

`tests/education.test.ts` covers additive migration, evidence separation, prerequisite guidance, mastery, review intervals, adaptive challenge selection, daily plan budgets, idempotent XP, achievement criteria, streaks, recommendations and every authored reference solution. `storage.test.ts` additionally writes a populated legacy state to IndexedDB and verifies preservation, and restores a v2 backup with learning evidence, drafts and rewards.

`tests/e2e/learning.spec.ts` covers career selection, diagnostics, sourced course previews and tracker integration; real code execution of all 25 reference solutions; completion/checkpoint gates; repeated submission XP protection; quiz and arcade explanations; recommendations after repeated mistakes; offline code execution; competency/achievement layouts; capstone-core execution and portfolio/interview provenance. The mobile editor is driven with CodeMirror's keyboard selection command rather than direct contenteditable DOM replacement.

Security cases execute infinite loops, forged worker messages, attempted prototype changes, absent localStorage and blocked network requests in the actual opaque-frame runner. CSP headers on the production test server match the runner/application policies in the static deployment configuration. The runner has no main-app data or tokens. These checks are targeted regression coverage, not a penetration-test certification or hard memory-quota guarantee.

`tests/tutor.test.ts` verifies disabled-by-default behavior, origin/host/loopback restrictions, payload bounds, remote-upstream rejection, bounded teaching requests, fixture responses and rate limiting. It mocks the upstream; no live model output or teaching quality is asserted. The optional tutor remains loopback-only and separate from account APIs; it does not assign grades.

Device emulation does not prove successful installation on a physical Android phone. Browser notification permission behavior, different PDF viewers, browser quota/eviction policies, and actual Vercel HTTPS deployment behavior require deployment/device validation. Account authentication and isolation are tested locally; a public HTTPS deployment has not been tested. No Lighthouse score has been measured.

The final executed results are recorded in `VALIDATION.md` after the completed test run.


Account coverage: tests/auth.test.ts uses real HTTP and isolated in-memory SQLite to verify registration, password checks, duplicate/invalid registration, HttpOnly cookies, CSRF origin rejection, session revocation, user isolation, stale revisions, upload validation and rate limiting. tests/e2e/auth.spec.ts verifies the full account UI, separate-browser access, certificate upload/backup/restore, logout, local mode and accessibility. Playwright account fixtures use a separate database under work; user account data is not modified by tests.

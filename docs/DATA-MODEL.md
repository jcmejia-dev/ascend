# Local database and backup contract

IndexedDB `ascend`, schema version **1**:

| Object store | Key | Value |
|---|---|---|
| `state` | `main` | Validated State: schema, revision, profile, records, timer, optional additive education payload |
| `files` | attachment UUID (`id`) | id, name, MIME type, Blob |

An initial database upgrade creates both stores. ASCEND 2 adds a validated `education.version = 1` payload to the existing aggregate state; it does not remove or recreate either store. `validateState` supplies the same empty education payload when loading a v1 state, so migration is additive and idempotent. The payload persists in the next normal revision-checked transaction. A future object-store change requires an explicit IndexedDB version upgrade. The separate account backend creates version-one SQLite tables on startup; it does not migrate or upload the browser database automatically.

`records` has separate collections for courses, certificates, practice, projects, goals, sessions, paths, milestones, skills, career, and reminders. Records have UUIDs, title, createdAt, updatedAt, and form-specific primitive fields. Default roadmap/skill templates have stable IDs and no claimed completion. Catalog entries live separately in source code, never as personal enrollments.

References use courseId, projectId, certificateId, pathId. Deleting a related record clears its references; deleting a learning path removes its milestones. Deleting a certificate or project also deletes its local image/PDF. Completed lesson counts are validated against known totals; unknown totals use bounded manual progress. Explicit Completed course records require an actual completion date.

Local writes validate data and check the stored revision before incrementing it in a read/write transaction. State and attachment changes commit together or abort together. Record edits also compare updatedAt against the editor's original version. Stale edits are rejected, preserving the latest record. This is local conflict detection, **not cloud synchronization**.

New exports use `ascend-backup` **version 2** and include the education payload. Imports accept versions **1 and 2**, supplying defaults for a legacy backup. V2 exports are intentionally rejected by the old v1 app rather than silently losing learning progress. Import validates the entire backup and references before replacement; its transaction compares the current revision and replaces state/files atomically. Timer snapshots import as paused. All certificates are included in full backups regardless of summary visibility, because backups are private copies for recovery.

Summary visibility is metadata controlling the Markdown learning summary only. It creates no public share route. Verification URLs are untrusted user-entered links and do not prove credential authenticity.

## Education entity mapping

The local workspace implementation uses an aggregate transactional store and immutable content banks rather than SQL tables. These are logical entities; derived views are recomputed from evidence rather than independently edited scores.

| Requested entity | Source or persisted field |
|---|---|
| career_paths / career_competencies | `tracks` bank + `education.customTracks`; competency IDs and prerequisite graph |
| user_career_goals | `education.primary`, `secondary`, `preferred`, `budget`; original personal `goals` remain intact |
| skill_assessments / assessment_attempts | Diagnostic/Git/calculator-core definitions + `attempts` with kind `assessment`; question evidence remains separately linked |
| course_catalog / course_recommendations | `discovery.resources` with official sources + deterministic goal/gap/history recommendations |
| learning_paths / learning_path_milestones | Career prerequisite graph + `overrides`; original `paths` and `milestones` still supported |
| lessons / lesson_progress | Versioned `lessons` + `drafts` and passed lesson/checkpoint attempts |
| quizzes / quiz_questions / quiz_attempts | Daily selection/review rules + versioned `questions` + question attempts |
| coding_challenges / coding_submissions / challenge_test_results | Reviewed lesson exercise bank reused for daily practice + challenge attempts with results and measured elapsed time |
| skill_mastery | Derived distinct evidence count, recent accuracy and error rules; self-reports stored separately |
| review_schedule | `reviews[unit]`: due day, interval and successful review count |
| achievements / user_achievements | Badge definitions and derived criteria + monotonic `awards` timestamps |
| xp_events | `xp` unique key, amount at award time, timestamp and description; `weights` configure future awards |
| daily_learning_plans | `plans[day]`: time budget, editable task list and organizational checkmarks |
| capstone_projects / project_submissions | Original capstone bank + repository, checklist, assistance and documentation declarations in `submissions` |
| interview practice | Original prompts + reflections in `attempts`; no automated hiring grade |

Attempt UUIDs, submission UUIDs, reward keys, custom track IDs and achievement IDs must be unique. References to learning units, tracks, capstones, draft/review units and checklist items are validated. Attempt kinds and topics must agree with the referenced content. XP must have corresponding successful activity evidence (or all beginner lessons for the path award). Imported orphaned/duplicate events are rejected. State and file writes remain atomic.

Reward identity is `bank-version:reward-kind:unit-id`, with question and game activities sharing the `quiz` reward kind. Retaking a quiz, switching to arcade or submitting the same coding task on another day retains practice history but cannot duplicate its XP. A lesson and its daily coding variant share one topic evidence unit, so repetition cannot falsely create two distinct evidence sources. Editing XP weights does not rewrite previous awards. Plan checkmarks and interview reflections award no XP.

Stored provenance is explicit: self-reports, evaluated local fixtures, external course declarations, external credentials, and project/interview declarations are different sources. Repository links are not fetched. Certificate fields now optionally include `careerPathId` and `milestoneId`; existing course and credential attachments remain unchanged. Local backups are not signed attestations, and a device owner can modify their own data with developer tools; this is personal learning evidence, not an examination authority.


## Account backend

SQLite tables: users (UUID, unique normalized email, display name, password salt/hash), sessions (hashed token, user foreign key, expiry), and workspaces (user primary/foreign key, revision, aggregate state JSON, attachment JSON). Prepared queries always scope workspace access to the session user. Each conditional UPDATE saves records and attachments together; stale revisions return 409. The server applies the same state, evidence and file validation as the client. Local IndexedDB remains separate and unchanged. See ACCOUNTS.md for deployment and retention.

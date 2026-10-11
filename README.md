# ASCEND

**Learn. Build. Prove.** ASCEND 2.0 is a personal developer learning platform: career goals, diagnostics, prerequisite roadmaps, a JavaScript coding academy, daily practice, internal achievements and portfolio evidence, alongside the original tracker and certificate vault. It supports **server-backed accounts** and a separate local workspace. New installations have no claimed personal accomplishments.

## Run locally

Requires Node.js 24 or newer and npm. In PowerShell:

```powershell
cd C:\Users\pc\OneDrive\Documents\Projects\Certificaties
npm ci
npm run dev
```

Open http://localhost:3000. Development mode does not register a service worker, to prevent stale development assets.

For the production app, including offline support:

```powershell
npm run build
npm start
```

The build exports to `out/` and generates a service worker with a content fingerprint and an explicit list of offline assets. The built-in production server uses port 4173 (http://localhost:4173). Stop it with Ctrl+C. If you switch between development and production on the same origin, unregister the old worker in browser developer tools before testing development; **do not clear site data without a backup**.

On Windows, the prebuild script preserves the previous generated `.next/` cache under `work/build-cache-*`. This avoids Next.js cleanup failures on OneDrive reparse directories. These are temporary build caches, excluded from Git and the source archive; you can remove old cache folders through File Explorer when no build is running. Stop development servers before a production build.

## First steps

1. Open **Career Paths** to answer “What do you want to become?” Choose a primary track and optional secondary tracks. All ten defaults can be edited; custom tracks can be created. Take the retakable diagnostic, report your experience, then demonstrate practical knowledge in the academy. Self-reporting never creates demonstrated mastery.
2. Use **Discover Courses** for official sources, prerequisites, curriculum where available, certification information and transparent personal estimates. Add a resource to **My Learning**, start it locally, or save it for later. Enroll separately with the external provider. Resource hubs are labeled and do not pretend to be fixed courses.
3. Open **Coding Academy**. JavaScript has 25 original beginner/intermediate/advanced lessons. Write `solve(input)`, run examples, test the complete fixture set, then answer the lesson checkpoint. Run alone never completes an activity. CodeMirror provides highlighting, line numbers, indentation, formatting and draft saving.
4. Use **Daily Challenge** for adaptive coding suggestions and quizzes; **Code Arcade** provides Bug Hunter and Output Predictor. Due reviews and recent mistakes influence the plan. Every topic remains explorable.
5. Review **Achievements** for unique XP events, levels, earned/locked badges and activity streaks. Open **Progress** for competency evidence, readiness criteria, capstones and interview reflections. Project checklists and repository submissions are explicitly self-reported; an optional calculator-core check executes only the pasted function.

The original features remain available:

1. Add a course, or use **Courses → Browse catalog**. Catalog suggestions never enroll you automatically.
2. Record the lesson count, or leave it at zero and enter manual progress. Use **Complete lesson** to increment completed lessons. At 100%, the course remains in its existing status until you explicitly choose Completed and supply a completion date.
3. Add certificates under **Certificates**. Upload an image, a PDF, or both. Dates, provider, credential ID, notes, and verification links are editable. Credential records are independently unverified; an entered URL does not create a Verified badge.
4. Use **Study** to log sessions or run a focus timer. **Finish & log** saves a completed session immediately, then opens its details to add notes. Canceling that edit retains the saved session. Breaks and sessions under one minute are not logged.
5. Adapt **Roadmap**, log coding **Practice**, and create **Goals**. Study-hours, exercise, course, and project goals calculate progress from records in the goal's date window. Manual goals use the entered value.
6. Record portfolio **Projects**, assess **Skills**, and review your **Career** checklist.
7. Use **Settings → Export full backup** regularly. It includes every record and attachment. The learning summary is a separate Markdown export intended for resume planning and excludes Private certificates.

For an open-app weekly review, add a reminder with type **Weekly progress summary** and repeat **Weekly**. The summary uses your actual last-seven-day study hours and completed practice records. Other reminder types can link to a course, goal, or certificate.

## Android installation

Android installation needs **HTTPS**, except localhost on the device. A Windows LAN address over plain HTTP can show the interface but does not provide a secure PWA installation origin.

Deploy the Node account server behind HTTPS (or use the static-only Vercel instructions below for local mode), visit the deployed HTTPS URL in Android Chrome, and choose **browser menu → Add to home screen → Install**. When the browser exposes an installation prompt, Settings also shows an Install ASCEND button. Visit online once and wait for the service worker to finish caching; the app can then reopen and accept local edits offline.

An **Update available** button appears only when a replacement service worker has actually installed and is waiting. The current worker stays active until you choose to update. Save open forms first. Updates change the application shell; IndexedDB records remain separate. Keep the same HTTPS hostname to retain the same local data.

Automated Chromium checks cover offline reload and actual service-worker replacement at desktop and Android-sized viewports. Installation on a physical Android device and browser-specific PDF viewing still need your device check. No Lighthouse score is claimed.

## Static-only deployment to Vercel

1. Put this folder into a Git repository and push to a repository you control. No GitHub repository or deployment is created automatically.
2. Import the repository in Vercel. Choose the **Other** framework preset (this is a Next.js static export).
3. Set install command `npm ci`, build command `npm run build`, output directory `out`. The included `vercel.json` already defines these build/output settings and security/cache headers.
4. Deploy. No API keys, database URL, or other environment variables are needed.
5. On the deployed URL, check `/manifest.webmanifest` and `/sw.js`, make one course, export a backup, reload offline, and install on your phone.

Certificate data is never uploaded to Vercel. Hosting provides application files only. Opening the site on desktop and phone creates **separate local databases**. Move records between them with a backup export/import. Import replaces current records rather than merging them, and requires a confirmation showing record and attachment counts.

## Verification

```powershell
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The GitHub Actions workflow runs these checks on pushes and pull requests. End-to-end tests use production output and run serially because the update-detection test temporarily replaces the built service-worker script and restores it afterward. Test screenshots and traces are stored under `test-results/` on failures. Do not run a production rebuild while the browser tests are running.

## Storage and privacy

- Local-workspace records and Blob attachments live in **IndexedDB**, database `ascend`, version 1. Account records and attachments live in the server SQLite database, isolated by authenticated user ID. Account edits require a connection; no offline synchronization queue is implemented.
- Data writes and file changes use one transaction. Revision checks prevent stale tabs from overwriting newer records. BroadcastChannel refreshes other open tabs; a stale edit is rejected and can be reopened.
- A browser origin (scheme + hostname + port) owns its database. Changing the origin, clearing browser data, uninstalling with data removal, browser eviction, or losing the device can lose access to records. A persistent-storage request can reduce eviction risk, but does not replace backups.
- Local data is not encrypted by ASCEND. Anyone with access to your browser profile or an exported backup may access it. Protect your device and backups.
- Backups are JSON with base64 attachments, have a 150 MB import limit, and are validated before an atomic replace. Each attachment is limited to 10 MB. SVG, HTML and executable uploads are rejected; accepted PDF/PNG/JPEG/WebP files require matching MIME and file signatures. Browser PDF previews use a sandboxed iframe; on some Android browsers use Download to view a PDF instead.
- Imported links only open with HTTP or HTTPS. The app uses React text rendering and never injects record HTML. Inputs are validated on both client and account server. Database queries use prepared statements and authenticated ownership.
- Timer state uses timestamps, duration caps, and 15-second checkpoints. It pauses on visibility loss. After a reload or abrupt close, only the last saved active checkpoint is retained; up to 15 seconds may be lost, but closed-app time is not counted. A paused timer can be resumed on this tab. Finish a timer in its active tab whenever possible.
- Study session totals and practice hours are tracked separately to avoid assuming a practice log was a distinct study session. Streaks consider positive-duration activity in either category.
- Browser notifications require permission and work only while ASCEND is running. In-app deadline, expiration, and configured reminder views are available without notification permission. There is no closed-app Web Push service.

## Upgrade implementation status

| Phase | Working behavior |
|---|---|
| A: Foundation | Ten editable career tracks, primary/secondary/custom goals, self-reports separated from retakable diagnostics, deterministic prerequisite graph with explanations and overrides, ten curated provider resources, detailed previews and original tracker integration |
| B: Academy | 25 substantive JavaScript lessons, real CodeMirror editing/formatting, isolated module execution and fixture evaluation, concept checkpoints, daily challenges/quizzes, persistent drafts and attempt history |
| C: Adaptation | Two distinct successful activities plus recent accuracy support a topic checkpoint; repeated errors trigger review, spaced review intervals, prerequisite guidance, schedule/budget/preferences/course-history-aware recommendations and adjustable daily plans |
| D: Rewards | Configurable XP, stable unique reward keys, scalable levels, ten badges with real criteria, activity streaks, Bug Hunter and Output Predictor with evaluated answers and explanations |
| E: Career | Six evidence-based readiness stages, selected-career competency requirements, ten capstone templates, repository declarations, real pasted calculator-core checks, Git assessment, interview reflections and linked credential context |
| F: Hardening | Additive state migration, v1/v2 backup validation, original transactional conflict protection, offline runner/editor assets, responsive themes, browser security checks, unit/storage/proxy tests and CI |

PHP, Python and native TypeScript execution are **not enabled**. TypeScript contracts, modules and HTTP are taught through clearly labeled JavaScript boundary exercises; external networking is blocked in the runner. Catalog hubs and documentation do not imply a fixed provider course. The current challenge bank has 25 distinct exercises: Century Club stays locked until the bank grows to 100; repeated submissions cannot farm it.

Mastery is a bounded learning signal from this reviewed bank, not a certification or comprehensive professional assessment. XP and streaks never establish employability. Readiness also requires the selected career competencies and, for later stages, assessment, review and declared project evidence. Custom competencies need corresponding evaluated content before they can be demonstrated.

## Isolated JavaScript execution

`scripts/build-runner.mjs` produces the trusted `public/runner.html`. The app fetches this cached asset, puts it in an iframe with **only `sandbox="allow-scripts"`**, and sends only the submitted source and public exercise fixtures. The frame has an opaque origin and a restrictive CSP: no network, forms, nested frames, external scripts or object embedding. A disposable worker imports the submitted code as a separate Blob module. There is no `eval` / `new Function` execution in the application or its server.

The trusted worker harness retains a private MessageChannel port in a closure inaccessible to the imported module, captures comparison primitives, freezes relevant built-in prototypes, and compares bounded JSON-compatible values. Ordinary worker messages cannot submit grades. The parent validates the frame source, opaque origin, request ID, message shape, labels and result count. The frame terminates the worker after 3 seconds; the parent removes the frame after 5 seconds. Source, console output and result structure are bounded. Runner evaluations stay in the browser. Saved account drafts are included in the private server workspace; local-workspace drafts stay in IndexedDB.

This is a browser learning sandbox, not a hardened multi-tenant container or high-stakes examination service. The browser controls memory allocation; there is no reliable per-worker hard memory quota. Additional cases are withheld from the exercise UI but remain inspectable in the client bundle. Local backups/devtools are under the device owner's control; progress is not cryptographically tamper-proof. No uploaded or submitted code runs on the Node server.

## Optional local AI tutor

Core learning, grading and hints need no model or API key. In an academy exercise, **Optional AI learning tutor** is disabled unless the local production server has the Ollama proxy enabled. Static Vercel hosting does not provide this API.

With Ollama running locally and a model already installed, start the production server in PowerShell:

```powershell
$env:ASCEND_OLLAMA = "1"
$env:OLLAMA_MODEL = "your-installed-model-name"
$env:OLLAMA_URL = "http://127.0.0.1:11434"
npm start
```

Open `http://localhost:4173`. The proxy accepts same-origin localhost JSON requests from loopback clients only, uses a configured loopback upstream, bounds input/output/time, limits concurrent requests and never exposes provider credentials. The tutor supports progressively specific hints, requested full explanations, code/error review and interview practice. Including your current code is an explicit checkbox. Only the selected lesson context, question and optionally code are sent; the tutor has no tools or grade/database write path. Responses are advisory. The transport and restrictions have automated fixture tests; no live model response quality is claimed. Paid API providers are not configured in this release.

To disable the proxy, remove `ASCEND_OLLAMA` from the environment and restart the server. Keep the server and Ollama on your own machine; this proxy is not a public multi-user service. See [Ollama's API documentation](https://github.com/ollama/ollama/blob/main/docs/api.md) for the underlying chat endpoint.

## Original tracker implementation

| Area | Implemented |
|---|---|
| Phase 1: Core | Personalized dashboard, actual metrics, course CRUD/search/filter/sort/archive, lesson/manual progress, local certificate vault with image/PDF upload, preview/download, expiration status, three persisted themes, responsive desktop and mobile navigation |
| Phase 2: Learning | Timestamp focus/Pomodoro/break timer, session CRUD, five editable roadmap templates and custom paths/milestones, linked courses/projects, practice logs with AI categories, goal CRUD and automatic calculations, date-filtered analytics, earned activity achievements |
| Phase 3: Career | Project CRUD/detail view and attachments, links to course/certificate, skill evidence and self-assessed confidence, target-role competency checklists, interview/resume/application logs, Markdown summary export |
| Phase 4: PWA | Local offline records, cached app shell, manifest and regular/maskable icons, install prompt/guidance, real worker update detection, open-app reminders, browser notification permission, attachment-inclusive backup/restore |

**Implemented accounts:** registration, login, logout, persistent private workspaces, attachment storage, cross-device access, server validation and revision conflict checks. **Planned:** email verification/recovery, PostgreSQL/object-storage scaling, offline account queues, closed-app Web Push, automatic credential verification and recurring calendar integrations.

Current UI supports one image and one PDF per certificate or project. It does not provide a PDF page thumbnail renderer, automated course-content imports, course-provider login integrations, accreditation checks, or employability scores. Certificates without expiration dates remain undated rather than receiving invented expiration.

## Project structure

- `src/app/`: static Next.js entry and responsive theme styles.
- `src/components/`: interactive views, forms, viewer, timer, and PWA lifecycle.
- `src/lib/model.ts`: validation, date/progress/time/goal/achievement calculations.
- `src/lib/storage.ts`: transactional IndexedDB and backup handling.
- `src/lib/catalog.ts` and `discovery.ts`: curated provider resources, source metadata and recommendation rules.
- `src/lib/academy-content.ts`: original versioned lessons, questions, tracks, capstones and interview prompts.
- `src/lib/education.ts`: additive education schema, evidence rules, reviews, plans, readiness and idempotent rewards.
- `src/lib/runner.ts`, `scripts/build-runner.mjs`: opaque-frame execution boundary and validated harness transport.
- `scripts/`: local asset preparation, offline build generation, and static server.
- `tests/`: unit/storage tests and Playwright critical workflows.
- `docs/`: schema and implementation notes.

The catalog links to official provider pages. Its reviewed information is a starting point; providers can change pricing and credential requirements. Geist is bundled locally under the SIL Open Font License, included in `public/fonts/LICENSE.txt`. Lucide supplies interface icons.



## Login and registration

The production Node server now supports private user accounts and cross-device access. Use Register or Sign in at startup; Continue on this device opens the preserved local workspace. Account APIs require a connection. See [account setup and HTTPS hosting](docs/ACCOUNTS.md) before sharing with other users; static hosting alone does not run accounts.


# ASCEND: Neon PostgreSQL + Vercel cloud accounts

## Status

This branch implements a PostgreSQL-backed serverless account API, preserving
the existing local IndexedDB workspace and the standalone SQLite server.
The Neon database has been provisioned by the project owner. Cloud operation
requires the SQL migrations, a configured Vercel secret, and a successful
deployment smoke test. A GitHub secret alone does not configure Vercel.

## Architecture

- `api/auth/{register,login,session,logout}.ts`: Vercel Node functions.
- `api/workspace.ts`: authenticated cloud workspace read/write.
- `api/course-search.ts`: official catalogue discovery.
- `src/server/cloud.ts`: parameterized PostgreSQL queries and revision checks.
- `src/server/security.ts`: scrypt password hashes, hashed session tokens,
  secure host-only cookies, origin checks and bounded JSON parsing.
- `db/001_neon_schema.sql`: user, session, workspace and attachment metadata.
- `db/002_cloud_runtime.sql`: private attachment bytes and persistent
  15-minute rate-limit counters.

All cloud records are scoped to the authenticated session's user ID. A client
cannot select another user by changing a request parameter. Workspace writes
are transactional and require the current revision; stale saves return 409.

**Certificate attachments:** For this initial release, private PDF/image bytes
are stored in PostgreSQL, not public object storage. The cloud limits are
2 MB per file, 3 MB total per account workspace, up to 20 files. The browser
local workspace still supports its separate 10 MB-per-file limit. These cloud
limits keep requests under common serverless payload limits; move to private
object storage before expanding them.

## GitHub test workflow

`DATABASE_URL` must be stored as a GitHub Actions repository secret.
The `ASCEND Neon integration` workflow runs only on pushes to the
project's development branch, applies idempotent migrations and creates two
randomly named test users. It verifies login cookies, isolated workspaces,
read-after-write persistence, revision conflict, cross-origin protection and
logout, then deletes **only its own test users**.

Run `npm run db:migrate` with `DATABASE_URL` in a server-only environment
to apply both SQL files. Do not run migrations against unrelated databases.

## Deploy to Vercel (after passing GitHub checks)

1. Import `jcmejia-dev/ascend` into Vercel as **Other** framework. The
   existing `vercel.json` exports the static app to `out` and the
   `api/` directory supplies Vercel Node functions.
2. In **Settings → Environment Variables**, add `DATABASE_URL` using
   the Neon pooled TLS connection string. Do **not** prefix it with
   `NEXT_PUBLIC_` or commit it to Git.
3. Leave `ASCEND_ORIGIN` unset for preview aliases, or set it to the exact
   public HTTPS origin for a fixed production domain. It must match the
   browser origin exactly.
4. Deploy a preview and verify `/api/auth/session` returns
   `{"user":null}` before login. A 404 means Vercel did not detect the
   functions; a 503 means `DATABASE_URL` is missing or invalid.
5. Register two test accounts, save a course in one, confirm it is not visible
   in the other, sign out/in and confirm persistence. Upload a small PDF
   certificate, verify it links to the right course, and confirm it is still
   available after a fresh sign-in.
6. Test PWA installation and offline behavior. Cloud account writes require
   network access; only the local workspace supports offline editing.

## Important public-launch limitations

- Email addresses are **not yet verified** and self-service password reset is
  not available. Users must securely store their passwords; the operator
  needs a controlled recovery procedure before a broad public launch.
- The public serverless API has persistent login attempt limits by normalized
  email and edge-supplied address. Consider Vercel WAF and additional abuse
  controls before a high-traffic launch.
- External course providers do **not** automatically report enrollments,
  lesson progress or certificates to ASCEND. That requires authorized
  provider-specific integrations.
- The certificate editor can link a unique title/provider match or an
  explicitly selected course. An issue date and PDF, image or verification
  URL can mark the course completed **as user-reported**. This is not
  independent issuer verification.
- The optional Ollama tutor runs only on the standalone local server; it is
  not a public Vercel API.
- Export backups regularly. Account workspaces have online-only editing,
  not offline conflict resolution.

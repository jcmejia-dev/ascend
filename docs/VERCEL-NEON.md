# ASCEND public deployment: Vercel + Neon

## Current status (read before inviting users)

ASCEND currently has **two different storage modes**:

- **Local workspace:** IndexedDB in the user's browser. Works in the static
  Vercel build; it is not a shared account and does not sync across devices.
- **Account workspace:** A standalone Node.js server with SQLite, documented
  in [ACCOUNTS.md](./ACCOUNTS.md). The static Vercel build does not run it.

This branch adds a Vercel-compatible **public course-discovery endpoint**
(`api/course-search.ts`) and certificate/course reconciliation. It does
**not** yet migrate account authentication or storage to Neon.

Do not advertise public synchronized accounts until the serverless backend is
implemented, deployed, and tested.

## Neon database preparation

1. Create a dedicated Neon PostgreSQL project/database for ASCEND.
2. Review `db/001_neon_schema.sql`, then run it once using the Neon SQL Editor.
   The migration creates tables; it does not delete existing records.
3. In Vercel, set `DATABASE_URL` as a **server-side environment variable**.
   Do not put it in a `NEXT_PUBLIC_` variable, GitHub, or frontend code.
4. Choose a private object-storage provider for certificate images and PDFs.
   Database rows should contain only private storage keys and metadata.
5. Implement serverless account APIs matching the current client contract:
   - `GET /api/auth/session`
   - `POST /api/auth/register`
   - `POST /api/auth/login`
   - `POST /api/auth/logout`
   - `GET /api/workspace`
   - `PUT /api/workspace`
6. Authenticate every request with an HttpOnly, Secure, SameSite cookie and
   server-side session lookup. Scope every query by authenticated user ID;
   never accept a user ID from the request as authority.
7. Implement atomic workspace revision checks and private attachment
   authorization. Add durable, distributed login rate limiting, account
   recovery, and email verification before opening public registrations.
8. Implement explicit opt-in migration from a local backup to an account;
   never silently overwrite or upload a local workspace.
9. Run database migrations, tests, security review, and an end-to-end
   two-account isolation test before announcing cloud sync.

**Important:** This SQL file is a schema, not a working database integration.
Do not switch the app to account mode until all endpoints exist.

## Automatic course tracking: what is and is not possible

ASCEND automatically records its **own** lesson, quiz and coding-challenge
results. Its assisted plan recommends external resources and adds up to three
suggestions to My Learning.

The public course-discovery endpoint searches allowlisted Harvard CS50 and
archived Stanford SEE catalogues. This is **not** a whole-web search. The
curated resource list covers additional official providers. A provider may
change its catalogue or block automated access.

External providers generally do not provide a common API for course
enrollment, progress or certificate retrieval. Genuine automatic syncing
requires a provider-specific, authorized integration (for example OAuth or an
official API) with clear user consent and token storage. Do not scrape private
dashboards or ask users for provider passwords.

The certificate editor now reconciles an earned certificate with a unique
matching course title and issuer, or uses the explicitly selected course.
If an issue date and PDF, image or verification URL are present, ASCEND marks
the linked course completed **as a user-reported event**. It does not claim
the issuer independently verified that credential. Pending or future-dated
credentials do not auto-complete a course. All changes remain editable.

## Pre-deployment checklist

- [ ] Build and unit tests pass.
- [ ] Live search works at `/api/course-search?q=javascript` on the Vercel
      preview, including graceful handling of provider downtime.
- [ ] A first-time local user can complete the guided setup.
- [ ] Two distinct accounts cannot read each other's records or attachments
      (after the Neon account backend is implemented).
- [ ] Registration, login, logout, expiry, recovery and email verification
      work on HTTPS (after the Neon account backend is implemented).
- [ ] Uploaded PDFs are private, size-limited and authorized.
- [ ] Existing local data is never silently lost during migration.
- [ ] The interface distinguishes in-app results, self-reported external
      completion, and independently verified credentials.

For a static-only preview, users can continue using the **local workspace**,
but they must export backups and should not expect cross-device synchronization.

# Accounts and deployment

Run `npm ci`, `npm run build`, then `npm start`. The login screen provides Register, Sign in, and Continue on this device. Registration creates an empty workspace with the user's name; local records are never uploaded automatically. Export a full backup in the local workspace, sign in, and import it in Settings to move existing records. Import replaces the account workspace after confirmation.

Accounts use the Node server and SQLite, not static hosting. Records and files persist in `data/accounts.sqlite` by default. `ASCEND_DB` can point to another persistent disk location. Never expose or commit this directory. Test servers use `work/e2e-accounts.sqlite` instead. Server administrators must back up SQLite consistently, including its journal, and maintain the disk. Ephemeral/serverless disks will lose accounts.

For other people to access ASCEND, deploy this Node app behind an HTTPS reverse proxy with a persistent volume. Set `ASCEND_ORIGIN=https://your-domain.example` to the exact public origin with no trailing path. The proxy must preserve the public Host header and forward requests to port 4173. Without this setting the server binds only to loopback and account requests accept localhost origins. The public setting enables Secure cookies; the proxy terminates TLS. No public deployment has been made by this change.

Example PowerShell environment for an HTTPS deployment:

```powershell
$env:ASCEND_ORIGIN = 'https://your-domain.example'
$env:ASCEND_DB = 'D:\AscendData\accounts.sqlite'
npm start
```

The static Vercel deployment instructions in README support local workspaces only. They do not host the account API. Development `npm run dev` also does not provide account APIs; test accounts with the production server.

Passwords require 12–128 characters and are hashed with individually salted scrypt (N=131072, r=8, p=1). Random session tokens are stored hashed on the server and delivered only in HttpOnly, SameSite=Strict cookies; public HTTPS uses a Secure __Host- cookie. Sessions expire after seven days and logout revokes the current session. Login/registration attempts are bounded per email and connection address, and password hashing concurrency is limited. Reverse-proxy clients share a connection-address limit unless the deployment adds its own trusted-edge rate limiting.

Mutations require the exact request origin and JSON. Workspace endpoints obtain ownership from the session, never a request-supplied owner, and check the expected signed-in user to prevent accidental writes after another tab changes accounts. State and attachments are validated and saved together with revision compare-and-swap. Stale device edits fail visibly. Authentication events refresh other tabs. APIs use no-store and are excluded from the service-worker cache. Account records are not saved to IndexedDB and require online access; local mode retains offline editing.

Email verification, password recovery, MFA and offline account queues are not included. Account files and records are not encrypted at rest; protect the server and exported backups. Local workspace data remains accessible to anyone sharing the same browser profile. For public operation, maintain HTTPS and a protected persistent database, and arrange account recovery with the operator until a recovery service is added.

Implementation references: [Node SQLite](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html), [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [OWASP session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

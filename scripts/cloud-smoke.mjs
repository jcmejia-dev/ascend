import { createServer, request as httpRequest } from "node:http";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { handleAuth, handleWorkspace } from "../.server/cloud.mjs";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required.");
process.env.ASCEND_ORIGIN = "https://ascend-smoke.example";
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const suffix = randomUUID().slice(0, 12);
const emails = [`ascend-smoke-${suffix}-one@example.invalid`, `ascend-smoke-${suffix}-two@example.invalid`];
const server = createServer((req, res) => {
  const path = new URL(req.url || "/", "http://localhost").pathname;
  if (path === "/api/workspace") return void handleWorkspace(req, res);
  const action = path.split("/").pop();
  if (["session", "login", "register", "logout"].includes(action))
    return void handleAuth(req, res, action);
  res.writeHead(404).end();
});
let port;
async function request(route, method = "GET", body, cookie = "", user = "", origin = process.env.ASCEND_ORIGIN) {
  return new Promise((resolve, reject) => {
    const req = httpRequest(`http://127.0.0.1:${port}${route}`, {
      method,
      headers: {
        host: "ascend-smoke.example",
        origin,
        "content-type": "application/json",
        cookie,
        "x-ascend-user": user,
      },
    }, (res) => {
      let text = "";
      res.on("data", (chunk) => { text += chunk; });
      res.on("end", () => {
        try {
          resolve({
            status: res.statusCode,
            body: JSON.parse(text),
            cookie: (res.headers["set-cookie"] || [""])[0].split(";")[0],
            headers: res.headers,
          });
        } catch (error) { reject(error); }
      });
    });
    req.on("error", reject);
    req.end(body === undefined ? undefined : JSON.stringify(body));
  });
}
function check(condition, description) {
  if (!condition) throw new Error("Cloud smoke check failed: " + description);
  console.log("PASS:", description);
}
try {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  port = server.address().port;
  const password = "A-long-unique-test-password-2026!";
  const a = await request("/api/auth/register", "POST", {
    name: "Test One", email: emails[0], password,
  });
  check(a.status === 200 && a.cookie.startsWith("__Host-ascend_session="), "secure registration and session");
  const b = await request("/api/auth/register", "POST", {
    name: "Test Two", email: emails[1], password,
  });
  check(b.status === 200, "independent second account");
  const one = await request("/api/workspace", "GET", undefined, a.cookie, a.body.user.id);
  const two = await request("/api/workspace", "GET", undefined, b.cookie, b.body.user.id);
  check(one.status === 200 && two.status === 200, "both workspaces available");
  check(one.body.state.profile.name === "Test One" && two.body.state.profile.name === "Test Two", "workspaces isolated");
  const changed = structuredClone(one.body.state);
  changed.profile.careerGoals = "Private goal for account one";
  const saved = await request("/api/workspace", "PUT", {
    state: changed, expectedRevision: 0, files: [],
  }, a.cookie, a.body.user.id);
  check(saved.status === 200 && saved.body.state.revision === 1, "durable workspace update");
  const repeat = await request("/api/workspace", "GET", undefined, a.cookie, a.body.user.id);
  check(repeat.body.state.profile.careerGoals === "Private goal for account one", "read-after-write persistence");
  const other = await request("/api/workspace", "GET", undefined, b.cookie, b.body.user.id);
  check(other.body.state.profile.careerGoals !== "Private goal for account one", "other account cannot read private data");
  const wrongUser = await request("/api/workspace", "GET", undefined, b.cookie, a.body.user.id);
  check(wrongUser.status === 403, "rejects mismatched account header");
  const stale = await request("/api/workspace", "PUT", {
    state: changed, expectedRevision: 0, files: [],
  }, a.cookie, a.body.user.id);
  check(stale.status === 409, "rejects stale revision");
  const crossOrigin = await request("/api/workspace", "PUT", {
    state: changed, expectedRevision: 1, files: [],
  }, a.cookie, a.body.user.id, "https://attacker.example");
  check(crossOrigin.status === 403, "rejects cross-origin write");
  const logout = await request("/api/auth/logout", "POST", {}, a.cookie);
  check(logout.status === 200, "logout");
  const revoked = await request("/api/workspace", "GET", undefined, a.cookie, a.body.user.id);
  check(revoked.status === 401, "revoked session cannot read workspace");
  console.log("Cloud integration smoke checks passed.");
} finally {
  for (const email of emails) {
    try { await db.query("DELETE FROM ascend_users WHERE email=$1", [email]); }
    catch { /* retain original failure */ }
  }
  await db.end();
  await new Promise((resolve) => server.close(resolve));
}

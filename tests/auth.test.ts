import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { createServer, request as httpRequest, type Server } from "node:http";
import { createAuth } from "../scripts/auth";
import { emptyState } from "../src/lib/model";
let server: Server, auth: ReturnType<typeof createAuth>, origin: string;
beforeEach(async () => {
  auth = createAuth(":memory:", "");
  server = createServer((req, res) => void auth.handle(req, res));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterEach(async () => {
  vi.restoreAllMocks();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  auth.close();
});

it("uses Secure host-only cookies behind the configured HTTPS origin", async () => {
  auth.close();
  auth = createAuth(":memory:", "https://ascend.example");
  const result = await request(
    "/api/auth/register",
    "POST",
    {
      email: "secure@example.com",
      name: "Secure Learner",
      password: "correct horse battery staple",
    },
    "",
    "",
    { host: "ascend.example", origin: "https://ascend.example" },
  );
  expect(result.status).toBe(200);
  expect(result.headers.get("set-cookie")).toContain("__Host-ascend_session=");
  expect(result.headers.get("set-cookie")).toContain("; Secure");
  expect(result.headers.get("set-cookie")).not.toContain("Domain=");
  expect((await request("/api/auth/session")).status).toBe(403);
});

it("expires sessions after seven days", async () => {
  const account = await register(),
    future = Date.now() + 8 * 24 * 60 * 60 * 1000;
  vi.spyOn(Date, "now").mockReturnValue(future);
  expect(
    (await request("/api/auth/session", "GET", undefined, account.cookie)).body
      .user,
  ).toBeNull();
});
async function request(
  route: string,
  method = "GET",
  body?: unknown,
  cookie = "",
  user = "",
  extra: Record<string, string> = {},
) {
  return new Promise<{
    status: number;
    body: any;
    cookie: string;
    headers: Headers;
  }>((resolve, reject) => {
    const req = httpRequest(
      origin + route,
      {
        method,
        headers: {
          "content-type": "application/json",
          origin,
          cookie,
          "x-ascend-user": user,
          ...extra,
        },
      },
      (response) => {
        let output = "";
        response.on("data", (chunk) => (output += chunk));
        response.on("end", () => {
          const headers = new Headers();
          for (const [name, value] of Object.entries(response.headers))
            if (value)
              headers.set(name, Array.isArray(value) ? value.join(",") : value);
          resolve({
            status: response.statusCode!,
            body: JSON.parse(output),
            cookie: headers.get("set-cookie")?.split(";")[0] || "",
            headers,
          });
        });
      },
    );
    req.on("error", reject);
    req.end(body === undefined ? undefined : JSON.stringify(body));
  });
}
async function register(email = "one@example.com") {
  return request("/api/auth/register", "POST", {
    email,
    name: "Learner One",
    password: "correct horse battery staple",
  });
}
it("registers with a private fresh workspace and an HttpOnly session", async () => {
  const result = await register();
  expect(result.status).toBe(200);
  expect(result.headers.get("set-cookie")).toContain("HttpOnly");
  expect(result.headers.get("set-cookie")).toContain("SameSite=Strict");
  expect(result.body.user).not.toHaveProperty("password");
  const workspace = await request(
    "/api/workspace",
    "GET",
    undefined,
    result.cookie,
    result.body.user.id,
  );
  expect(workspace.body.state.profile.name).toBe("Learner One");
  expect(workspace.body.state.records.courses).toEqual([]);
  expect(workspace.headers.get("cache-control")).toBe("no-store");
});
it("verifies passwords, normalizes emails and rejects duplicate registration", async () => {
  await register();
  expect((await register("ONE@example.com")).status).toBe(409);
  expect(
    (
      await request("/api/auth/login", "POST", {
        email: "one@example.com",
        password: "wrong password value",
      })
    ).status,
  ).toBe(401);
  expect(
    (
      await request("/api/auth/login", "POST", {
        email: "ONE@example.com",
        password: "correct horse battery staple",
      })
    ).status,
  ).toBe(200);
});
it("rejects malformed and weak registration data", async () => {
  expect(
    (
      await request("/api/auth/register", "POST", {
        email: "bad",
        name: "",
        password: "short",
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await request("/api/auth/register", "POST", {
        email: "valid@example.com",
        password: "long enough password",
      })
    ).status,
  ).toBe(400);
});
it("requires authentication and the expected account for workspace access", async () => {
  expect((await request("/api/workspace")).status).toBe(401);
  const a = await register(),
    b = await register("two@example.com");
  expect(
    (
      await request(
        "/api/workspace",
        "GET",
        undefined,
        b.cookie,
        a.body.user.id,
      )
    ).status,
  ).toBe(403);
  const state = emptyState();
  state.profile.name = "Private";
  expect(
    (
      await request(
        "/api/workspace",
        "PUT",
        { state, files: [], expectedRevision: 0 },
        a.cookie,
        a.body.user.id,
      )
    ).status,
  ).toBe(200);
  const other = await request(
    "/api/workspace",
    "GET",
    undefined,
    b.cookie,
    b.body.user.id,
  );
  expect(other.body.state.profile.name).toBe("Learner One");
  expect(other.body.state.revision).toBe(0);
});
it("rejects stale edits and invalid attachment data without changing records", async () => {
  const a = await register(),
    state = emptyState();
  const first = await request(
    "/api/workspace",
    "PUT",
    { state, files: [], expectedRevision: 0 },
    a.cookie,
    a.body.user.id,
  );
  expect(first.body.state.revision).toBe(1);
  expect(
    (
      await request(
        "/api/workspace",
        "PUT",
        { state, files: [], expectedRevision: 0 },
        a.cookie,
        a.body.user.id,
      )
    ).status,
  ).toBe(409);
  expect(
    (
      await request(
        "/api/workspace",
        "PUT",
        {
          state,
          files: [
            {
              id: crypto.randomUUID(),
              name: "bad.pdf",
              type: "application/pdf",
              data: btoa("invalid pdf"),
            },
          ],
          expectedRevision: 1,
        },
        a.cookie,
        a.body.user.id,
      )
    ).status,
  ).toBe(400);
});
it("rejects cross-origin mutations and invalidates sessions on logout", async () => {
  const a = await register();
  expect(
    (
      await request("/api/auth/logout", "POST", {}, a.cookie, "", {
        origin: "https://evil.example",
      })
    ).status,
  ).toBe(403);
  expect((await request("/api/auth/logout", "POST", {}, a.cookie)).status).toBe(
    200,
  );
  expect(
    (await request("/api/auth/session", "GET", undefined, a.cookie)).body.user,
  ).toBeNull();
  expect(
    (
      await request(
        "/api/workspace",
        "GET",
        undefined,
        a.cookie,
        a.body.user.id,
      )
    ).status,
  ).toBe(401);
});
it("rate-limits repeated attempts and rejects insecure public configuration", async () => {
  for (let i = 0; i < 15; i++)
    await request("/api/auth/login", "POST", {
      email: "one@example.com",
      password: "short",
    });
  for (let i = 0; i < 16; i++)
    await request("/api/auth/login", "POST", {
      email: "one@example.com",
      password: "short",
    });
  expect((await register()).status).toBe(429);
  expect(() => createAuth(":memory:", "http://example.com")).toThrow("HTTPS");
});

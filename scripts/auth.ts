import { DatabaseSync } from "node:sqlite";
import {
  randomBytes,
  randomUUID,
  scrypt,
  createHash,
  timingSafeEqual,
} from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import { emptyState, validateState, validateFile } from "../src/lib/model";
import { syncAwards } from "../src/lib/education";
import { createCourseSearch } from "./course-search";
import { applyAssistance } from "../src/lib/learning-assistant";
const derive = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(
      password,
      salt,
      64,
      { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    ),
  );
const credentials = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(12).max(128),
  name: z.string().trim().min(1).max(100).optional(),
});
const lifetime = 7 * 24 * 60 * 60 * 1000;
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function createAuth(
  databasePath = process.env.ASCEND_DB || path.resolve("data/accounts.sqlite"),
  configuredOrigin = process.env.ASCEND_ORIGIN || "",
) {
  if (
    configuredOrigin &&
    (new URL(configuredOrigin).protocol !== "https:" ||
      new URL(configuredOrigin).origin !== configuredOrigin)
  )
    throw new Error(
      "ASCEND_ORIGIN must use HTTPS. Omit it for localhost development.",
    );
  if (databasePath !== ":memory:")
    mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,salt TEXT NOT NULL,password TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS workspaces (user_id TEXT PRIMARY KEY REFERENCES users(id),revision INTEGER NOT NULL,state TEXT NOT NULL,files TEXT NOT NULL);`);
  const rates = new Map<string, { count: number; until: number }>();
  const searchCourses = createCourseSearch();
  let hashing = 0;
  function reply(
    res: ServerResponse,
    status: number,
    body: unknown,
    cookie?: string,
  ) {
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...(cookie ? { "Set-Cookie": cookie } : {}),
    });
    res.end(JSON.stringify(body));
  }
  function rate(key: string, limit: number) {
    const now = Date.now();
    for (const [k, v] of rates) if (v.until < now) rates.delete(k);
    const v = rates.get(key) || { count: 0, until: now + 15 * 60 * 1000 };
    v.count++;
    rates.set(key, v);
    return v.count <= limit;
  }
  async function body(req: IncomingMessage, max = 120 * 1024 * 1024) {
    if (!req.headers["content-type"]?.startsWith("application/json"))
      throw new Error("Expected JSON.");
    const parts: Buffer[] = [];
    let length = 0;
    for await (const part of req) {
      length += part.length;
      if (length > max) throw new Error("Request too large.");
      parts.push(Buffer.from(part));
    }
    return JSON.parse(Buffer.concat(parts).toString());
  }
  async function hash(password: string, salt: string) {
    if (hashing >= 2)
      throw new Error("Authentication is busy. Try again shortly.");
    hashing++;
    try {
      return await derive(password, salt);
    } finally {
      hashing--;
    }
  }
  return {
    close: () => db.close(),
    async handle(req: IncomingMessage, res: ServerResponse) {
      const url = new URL(req.url || "/", "http://localhost");
      const secure = Boolean(configuredOrigin),
        cookieName = secure ? "__Host-ascend_session" : "ascend_session";
      const host = req.headers.host || "";
      const origin =
        configuredOrigin ||
        (/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)
          ? `http://${host}`
          : "");
      if (
        !origin ||
        new URL(origin).host !== host ||
        (req.method !== "GET" && req.headers.origin !== origin)
      ) {
        reply(res, 403, { error: "Request origin is not allowed." });
        return;
      }
      const cookie = (value: string, age = 604800) =>
        `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure ? "; Secure" : ""}`;
      const token =
        (req.headers.cookie || "")
          .split(";")
          .map((v) => v.trim())
          .find((v) => v.startsWith(cookieName + "="))
          ?.slice(cookieName.length + 1) || "";
      db.prepare("DELETE FROM sessions WHERE expires < ?").run(Date.now());
      const user = db
        .prepare(
          "SELECT users.id,users.email,users.name FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token=? AND sessions.expires>?",
        )
        .get(digest(token), Date.now()) as
        { id: string; email: string; name: string } | undefined;
      try {
        if (url.pathname === "/api/course-search" && req.method === "GET") {
          if (!rate("search:" + req.socket.remoteAddress, 60)) {
            reply(res, 429, { error: "Please wait before searching again." });
            return;
          }
          const query = z
            .string()
            .trim()
            .min(1)
            .max(120)
            .parse(url.searchParams.get("q"));
          reply(res, 200, await searchCourses(query));
          return;
        }
        if (url.pathname === "/api/auth/session" && req.method === "GET") {
          reply(res, 200, { user: user || null });
          return;
        }
        if (url.pathname === "/api/auth/logout" && req.method === "POST") {
          db.prepare("DELETE FROM sessions WHERE token=?").run(digest(token));
          reply(res, 200, { ok: true }, cookie("", 0));
          return;
        }
        if (
          ["/api/auth/register", "/api/auth/login"].includes(url.pathname) &&
          req.method === "POST"
        ) {
          if (!rate("ip:" + req.socket.remoteAddress, 30)) {
            reply(res, 429, {
              error: "Too many attempts. Try again in 15 minutes.",
            });
            return;
          }
          const input = credentials.parse(await body(req, 4096));
          if (!rate("email:" + input.email, 15)) {
            reply(res, 429, {
              error: "Too many attempts. Try again in 15 minutes.",
            });
            return;
          }
          let account = db
            .prepare("SELECT * FROM users WHERE email=?")
            .get(input.email) as
            | {
                id: string;
                email: string;
                name: string;
                salt: string;
                password: string;
              }
            | undefined;
          if (url.pathname.endsWith("/register")) {
            if (!input.name) throw new Error("Enter your name.");
            if (account) {
              reply(res, 409, {
                error: "Unable to register this email. Try signing in.",
              });
              return;
            }
            const salt = randomBytes(32).toString("hex"),
              password = (await hash(input.password, salt)).toString("hex");
            account = {
              id: randomUUID(),
              email: input.email,
              name: input.name,
              salt,
              password,
            };
            const state = emptyState();
            state.profile.name = input.name;
            db.exec("BEGIN IMMEDIATE");
            try {
              db.prepare("INSERT INTO users VALUES (?,?,?,?,?)").run(
                account.id,
                account.email,
                account.name,
                salt,
                password,
              );
              db.prepare("INSERT INTO workspaces VALUES (?,?,?,?)").run(
                account.id,
                0,
                JSON.stringify(state),
                "[]",
              );
              db.exec("COMMIT");
            } catch (error) {
              db.exec("ROLLBACK");
              throw error;
            }
          } else {
            const result = await hash(
              input.password,
              account?.salt || "ascend-invalid-account-salt",
            );
            if (
              !account ||
              !timingSafeEqual(result, Buffer.from(account.password, "hex"))
            ) {
              reply(res, 401, { error: "Email or password is incorrect." });
              return;
            }
          }
          const newToken = randomBytes(32).toString("hex");
          db.prepare("INSERT INTO sessions VALUES (?,?,?)").run(
            digest(newToken),
            account.id,
            Date.now() + lifetime,
          );
          reply(
            res,
            200,
            {
              user: {
                id: account.id,
                email: account.email,
                name: account.name,
              },
            },
            cookie(newToken),
          );
          return;
        }
        if (!user) {
          reply(res, 401, { error: "Your session ended. Sign in again." });
          return;
        }
        if (req.headers["x-ascend-user"] !== user.id) {
          reply(res, 403, {
            error: "The signed-in account changed. Sign in again.",
          });
          return;
        }
        if (url.pathname === "/api/workspace" && req.method === "GET") {
          const workspace = db
            .prepare("SELECT state,files FROM workspaces WHERE user_id=?")
            .get(user.id) as { state: string; files: string };
          reply(res, 200, {
            state: JSON.parse(workspace.state),
            files: JSON.parse(workspace.files),
          });
          return;
        }
        if (url.pathname === "/api/workspace" && req.method === "PUT") {
          const input = await body(req),
            state = syncAwards(
              validateState(applyAssistance(validateState(input.state))),
            );
          if (
            !Number.isSafeInteger(input.expectedRevision) ||
            input.expectedRevision < 0
          )
            throw new Error("Invalid revision.");
          const files = z
            .array(
              z.object({
                id: z.string().uuid(),
                name: z.string().min(1).max(255),
                type: z.enum([
                  "image/png",
                  "image/jpeg",
                  "image/webp",
                  "application/pdf",
                ]),
                data: z.string().max(30 * 1024 * 1024),
              }),
            )
            .max(100)
            .parse(input.files);
          const ids = new Set();
          for (const file of files) {
            if (ids.has(file.id)) throw new Error("Duplicate attachment.");
            ids.add(file.id);
            if (!/^[A-Za-z0-9+/]*={0,2}$/.test(file.data))
              throw new Error("Invalid attachment.");
            const bytes = Buffer.from(file.data, "base64");
            await validateFile(new Blob([bytes], { type: file.type }));
          }
          for (const record of Object.values(state.records).flat())
            for (const key of ["imageId", "pdfId"])
              if (record[key] && !ids.has(record[key]))
                throw new Error("Missing record attachment.");
          const saved = { ...state, revision: input.expectedRevision + 1 };
          const result = db
            .prepare(
              "UPDATE workspaces SET revision=?,state=?,files=? WHERE user_id=? AND revision=?",
            )
            .run(
              saved.revision,
              JSON.stringify(saved),
              JSON.stringify(files),
              user.id,
              input.expectedRevision,
            );
          if (!result.changes) {
            reply(res, 409, {
              error:
                "Another tab or device changed your data. Reload and try again.",
            });
            return;
          }
          reply(res, 200, { state: saved });
          return;
        }
        reply(res, 404, { error: "Unknown account endpoint." });
      } catch (error) {
        reply(res, 400, {
          error:
            error instanceof z.ZodError
              ? "Check the form or workspace data."
              : error instanceof Error &&
                  /busy|name|attachment|revision|large|JSON/.test(error.message)
                ? error.message
                : "Unable to complete this request.",
        });
      }
    },
  };
}

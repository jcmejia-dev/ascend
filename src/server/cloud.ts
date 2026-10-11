import type { IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { database } from "./db";
import {
  allowedOrigin, cookie, credentialsSchema, getSessionToken, hashPassword,
  hashToken, newSalt, newToken, publicError, readJson, respond, verifyPassword,
} from "./security";
import { emptyState, validateState, validateFile } from "../lib/model";
import { applyAssistance } from "../lib/learning-assistant";
import { syncAwards } from "../lib/education";

type User = { id: string; email: string; name: string };
const sessionDays = 7;
const maxFile = 2 * 1024 * 1024;
const maxTotal = 3 * 1024 * 1024;
const fileSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(255),
  type: z.enum(["image/png", "image/jpeg", "image/webp", "application/pdf"]),
  data: z.string().min(4).max(Math.ceil(maxFile * 4 / 3) + 8),
});
const workspaceSchema = z.object({
  state: z.unknown(),
  expectedRevision: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  files: z.array(fileSchema).max(20),
});

async function rateLimit(key: string, limit: number) {
  const db = database();
  const result = await db.query<{ attempts: number }>(`
    INSERT INTO ascend_rate_limits (key, window_started_at, attempts)
    VALUES ($1, now(), 1)
    ON CONFLICT (key) DO UPDATE
      SET attempts = CASE
        WHEN ascend_rate_limits.window_started_at < now() - interval '15 minutes'
          THEN 1 ELSE ascend_rate_limits.attempts + 1 END,
          window_started_at = CASE
        WHEN ascend_rate_limits.window_started_at < now() - interval '15 minutes'
          THEN now() ELSE ascend_rate_limits.window_started_at END
    RETURNING attempts
  `, [hashToken(key)]);
  return result.rows[0].attempts <= limit;
}
async function session(req: IncomingMessage): Promise<User | null> {
  const token = getSessionToken(req);
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const result = await database().query<User>(`
    SELECT u.id, u.email, u.display_name AS name
    FROM ascend_sessions s JOIN ascend_users u ON u.id=s.user_id
    WHERE s.token_hash=$1 AND s.expires_at>now()
  `, [hashToken(token)]);
  return result.rows[0] || null;
}
async function authenticate(req: IncomingMessage, res: ServerResponse) {
  const user = await session(req);
  if (!user) {
    respond(res, 401, { error: "Your session ended. Sign in again." });
    return null;
  }
  if (req.headers["x-ascend-user"] !== user.id) {
    respond(res, 403, { error: "The signed-in account changed. Sign in again." });
    return null;
  }
  return user;
}
async function setSession(res: ServerResponse, user: User) {
  const token = newToken();
  await database().query(
    "INSERT INTO ascend_sessions (token_hash,user_id,expires_at) VALUES ($1,$2,now()+interval '7 days')",
    [hashToken(token), user.id],
  );
  respond(res, 200, { user }, cookie(token, sessionDays * 86400));
}
function reject(req: IncomingMessage, res: ServerResponse, method: string) {
  if (req.method !== method) {
    res.setHeader("Allow", method);
    respond(res, 405, { error: "Method not allowed." });
    return true;
  }
  if (!allowedOrigin(req)) {
    respond(res, 403, { error: "Request origin is not allowed." });
    return true;
  }
  return false;
}
function failed(res: ServerResponse, error: unknown) {
  const { status, message } = publicError(error);
  respond(res, status, { error: message });
}
export async function handleAuth(
  req: IncomingMessage, res: ServerResponse, action: "session" | "login" | "register" | "logout",
) {
  if (reject(req, res, action === "session" ? "GET" : "POST")) return;
  try {
    if (action === "session") {
      respond(res, 200, { user: await session(req) });
      return;
    }
    if (action === "logout") {
      const token = getSessionToken(req);
      if (token) await database().query(
        "DELETE FROM ascend_sessions WHERE token_hash=$1", [hashToken(token)],
      );
      respond(res, 200, { ok: true }, cookie("", 0));
      return;
    }
    const ip = String(req.headers["x-vercel-forwarded-for"] || req.socket.remoteAddress || "unknown")
      .slice(0, 128);
    if (!(await rateLimit("auth-ip:" + ip, 35))) {
      respond(res, 429, { error: "Too many attempts. Try again in 15 minutes." });
      return;
    }
    const input = credentialsSchema.parse(await readJson(req, 4096));
    if (!(await rateLimit("auth-email:" + input.email, 15))) {
      respond(res, 429, { error: "Too many attempts. Try again in 15 minutes." });
      return;
    }
    const db = database();
    const existing = await db.query<{
      id: string; email: string; name: string; password_salt: string; password_hash: string;
    }>(`SELECT id,email,display_name AS name,password_salt,password_hash
       FROM ascend_users WHERE lower(email)=lower($1)`, [input.email]);
    if (action === "login") {
      const row = existing.rows[0];
      // Run scrypt for unknown accounts too, to reduce user enumeration via timing.
      const valid = await verifyPassword(
        input.password,
        row?.password_salt || "unknown-account-salt",
        row?.password_hash || "",
      );
      if (!row || !valid) {
        respond(res, 401, { error: "Email or password is incorrect." });
        return;
      }
      await setSession(res, { id: row.id, email: row.email, name: row.name });
      return;
    }
    if (!input.name) {
      respond(res, 400, { error: "Enter your name." });
      return;
    }
    if (existing.rowCount) {
      respond(res, 409, { error: "Unable to register this email. Try signing in." });
      return;
    }
    const id = randomUUID();
    const salt = newSalt();
    const hashed = (await hashPassword(input.password, salt)).toString("hex");
    const state = emptyState();
    state.profile.name = input.name;
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await client.query(`
        INSERT INTO ascend_users(id,email,display_name,password_salt,password_hash)
        VALUES($1,$2,$3,$4,$5)
      `, [id, input.email, input.name, salt, hashed]);
      await client.query(`
        INSERT INTO ascend_workspaces(user_id,revision,state) VALUES($1,0,$2::jsonb)
      `, [id, JSON.stringify(state)]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      if ((error as { code?: string }).code === "23505") {
        respond(res, 409, { error: "Unable to register this email. Try signing in." });
        return;
      }
      throw error;
    } finally {
      client.release();
    }
    await setSession(res, { id, email: input.email, name: input.name });
  } catch (error) {
    failed(res, error);
  }
}

export async function handleWorkspace(req: IncomingMessage, res: ServerResponse) {
  if (reject(req, res, req.method === "GET" ? "GET" : "PUT")) return;
  try {
    const user = await authenticate(req, res);
    if (!user) return;
    const db = database();
    if (req.method === "GET") {
      const workspace = await db.query<{ state: unknown }>(
        "SELECT state FROM ascend_workspaces WHERE user_id=$1", [user.id],
      );
      if (!workspace.rows[0]) {
        respond(res, 404, { error: "Workspace not found." });
        return;
      }
      const attachments = await db.query<{
        id: string; name: string; type: string; content: Buffer;
      }>(`
        SELECT a.id,a.filename AS name,a.mime_type AS type,d.content
        FROM ascend_attachments a JOIN ascend_attachment_data d
          ON d.attachment_id=a.id
        WHERE a.user_id=$1 ORDER BY a.created_at
      `, [user.id]);
      respond(res, 200, {
        state: workspace.rows[0].state,
        files: attachments.rows.map((f) => ({
          id: f.id, name: f.name, type: f.type, data: f.content.toString("base64"),
        })),
      });
      return;
    }
    const input = workspaceSchema.parse(await readJson(req));
    const state = syncAwards(validateState(applyAssistance(validateState(input.state))));
    if (state.revision !== input.expectedRevision) {
      respond(res, 409, { error: "Workspace revision mismatch. Reload and try again." });
      return;
    }
    const files: { id: string; name: string; type: string; bytes: Buffer }[] = [];
    let total = 0;
    const ids = new Set<string>();
    for (const file of input.files) {
      if (ids.has(file.id)) throw new Error("Invalid duplicate attachment.");
      ids.add(file.id);
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(file.data))
        throw new Error("Invalid attachment encoding.");
      const bytes = Buffer.from(file.data, "base64");
      total += bytes.length;
      if (bytes.length > maxFile || total > maxTotal)
        throw new Error("Files exceed the 3 MB cloud workspace attachment limit.");
      await validateFile(new Blob([new Uint8Array(bytes)], { type: file.type }));
      files.push({ id: file.id, name: file.name, type: file.type, bytes });
    }
    for (const record of Object.values(state.records).flat()) {
      for (const key of ["imageId", "pdfId", "fileId"])
        if (record[key] && !ids.has(String(record[key])))
          throw new Error("Missing record attachment.");
    }
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query<{ revision: string }>(
        "SELECT revision FROM ascend_workspaces WHERE user_id=$1 FOR UPDATE",
        [user.id],
      );
      if (Number(existing.rows[0]?.revision) !== input.expectedRevision) {
        await client.query("ROLLBACK");
        respond(res, 409, {
          error: "Another tab or device changed your data. Reload and try again.",
        });
        return;
      }
      const saved = { ...state, revision: input.expectedRevision + 1 };
      await client.query(`
        UPDATE ascend_workspaces SET revision=$2,state=$3::jsonb,updated_at=now()
        WHERE user_id=$1
      `, [user.id, saved.revision, JSON.stringify(saved)]);
      await client.query(
        "DELETE FROM ascend_attachments WHERE user_id=$1", [user.id],
      );
      for (const file of files) {
        await client.query(`
          INSERT INTO ascend_attachments
          (id,user_id,storage_key,filename,mime_type,byte_size)
          VALUES ($1,$2,$3,$4,$5,$6)
        `, [file.id, user.id, user.id + "/" + file.id, file.name, file.type, file.bytes.length]);
        await client.query(
          "INSERT INTO ascend_attachment_data (attachment_id,content) VALUES ($1,$2)",
          [file.id, file.bytes],
        );
      }
      await client.query("COMMIT");
      respond(res, 200, { state: saved });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    failed(res, error);
  }
}

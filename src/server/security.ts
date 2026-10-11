import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { promisify } from "node:util";
import { z } from "zod";

const derive = promisify(scrypt);
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const newToken = () => randomBytes(32).toString("hex");
export const newSalt = () => randomBytes(24).toString("hex");
export async function hashPassword(password: string, salt: string) {
  return (await derive(password, salt, 64, {
    N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024,
  })) as Buffer;
}
export async function verifyPassword(password: string, salt: string, hash: string) {
  const actual = await hashPassword(password, salt);
  const expected = Buffer.from(hash, "hex");
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}
export const credentialsSchema = z.object({
  email: z.email().trim().toLowerCase().max(254),
  password: z.string().min(12).max(128),
  name: z.string().trim().min(1).max(100).optional(),
});
export const sessionCookie = "__Host-ascend_session";
export function cookie(value: string, age = 604800) {
  return `${sessionCookie}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
}
export function getSessionToken(req: IncomingMessage) {
  return (req.headers.cookie || "").split(";").map((part) => part.trim())
    .find((part) => part.startsWith(sessionCookie + "="))
    ?.slice(sessionCookie.length + 1) || "";
}
export function allowedOrigin(req: IncomingMessage) {
  const host = req.headers.host || "";
  if (!/^[a-z0-9.-]+(?::\d{2,5})?$/i.test(host)) return false;
  const configured = process.env.ASCEND_ORIGIN;
  const expected = configured || `https://${host}`;
  if (!expected.startsWith("https://") || new URL(expected).host !== host)
    return false;
  return req.method === "GET" || req.method === "HEAD" ||
    req.headers.origin === expected;
}
export function respond(res: ServerResponse, status: number, value: unknown, setCookie?: string) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    ...(setCookie ? { "Set-Cookie": setCookie } : {}),
  });
  res.end(JSON.stringify(value));
}
export async function readJson(req: IncomingMessage, limit = 4 * 1024 * 1024): Promise<unknown> {
  if (!req.headers["content-type"]?.startsWith("application/json"))
    throw new Error("Expected JSON.");
  const length = Number(req.headers["content-length"] || 0);
  if (length > limit) throw new Error("Request too large.");
  const parsed = (req as IncomingMessage & { body?: unknown }).body;
  if (parsed !== undefined) {
    if (Buffer.byteLength(JSON.stringify(parsed)) > limit)
      throw new Error("Request too large.");
    return typeof parsed === "string" ? JSON.parse(parsed) : parsed;
  }
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > limit) throw new Error("Request too large.");
    chunks.push(Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export function publicError(error: unknown): { status: number; message: string } {
  if (error instanceof z.ZodError)
    return { status: 400, message: "Check the submitted fields and try again." };
  if (error instanceof Error && /^(Expected JSON|Request too large|Invalid |Missing |Attachment |Too many |Files |Enter your name)/.test(error.message))
    return { status: 400, message: error.message };
  if (error instanceof Error && error.message === "DATABASE_URL is not configured.")
    return { status: 503, message: "Account service is not configured." };
  return { status: 500, message: "Account service is temporarily unavailable." };
}

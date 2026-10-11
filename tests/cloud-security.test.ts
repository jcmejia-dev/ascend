import { describe, expect, it } from "vitest";
import type { IncomingMessage } from "node:http";
import {
  allowedOrigin, cookie, credentialsSchema, hashPassword, newSalt,
  newToken, hashToken, verifyPassword,
} from "../src/server/security";

const request = (method: string, origin = "https://ascend.example") =>
  ({ method, headers: { host: "ascend.example", origin } }) as IncomingMessage;

describe("cloud account security", () => {
  it("requires same-origin mutations and HTTPS hosts", () => {
    expect(allowedOrigin(request("POST"))).toBe(true);
    expect(allowedOrigin(request("PUT", "https://evil.example"))).toBe(false);
    expect(allowedOrigin(request("GET", "https://evil.example"))).toBe(true);
    expect(allowedOrigin({ method: "POST", headers: { host: "attacker/evil" } } as IncomingMessage)).toBe(false);
  });
  it("issues secure, host-only, HttpOnly session cookies", () => {
    const value = cookie(newToken());
    expect(value).toContain("__Host-ascend_session=");
    expect(value).toContain("; HttpOnly;");
    expect(value).toContain("; Secure;");
    expect(value).toContain("SameSite=Strict");
    expect(value).not.toContain("Domain=");
  });
  it("hashes passwords with a per-user salt and compares them safely", async () => {
    const salt = newSalt();
    const password = "long unique test password 2026";
    const hashed = (await hashPassword(password, salt)).toString("hex");
    expect(await verifyPassword(password, salt, hashed)).toBe(true);
    expect(await verifyPassword("different long test password", salt, hashed)).toBe(false);
    expect(hashToken(newToken())).toMatch(/^[0-9a-f]{64}$/);
  });
  it("validates account data and normalizes email addresses", () => {
    expect(credentialsSchema.parse({
      email: " TEST@Example.COM ", password: "a long password 2026",
    }).email).toBe("test@example.com");
    expect(credentialsSchema.safeParse({
      email: "bad", password: "short",
    }).success).toBe(false);
  });
});

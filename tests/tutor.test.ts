import { it, expect, beforeEach, afterEach, vi } from "vitest";
import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("ASCEND_OLLAMA", "1");
  vi.stubEnv("OLLAMA_URL", "http://127.0.0.1:11434");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
const body = {
  prompt: "Explain this loop",
  context: "Loops",
  code: "",
  mode: "Conceptual hint",
};
async function request(
  options: {
    method?: string;
    body?: unknown;
    origin?: string;
    host?: string;
    address?: string;
  } = {},
) {
  const { tutorRequest } = await import("../scripts/tutor-proxy.mjs");
  const req = Object.assign(
    Readable.from([JSON.stringify(options.body ?? body)]),
    {
      method: options.method ?? "POST",
      headers: {
        host: options.host ?? "localhost:4173",
        origin: options.origin ?? "http://localhost:4173",
        "content-type": "application/json",
      },
      socket: { remoteAddress: options.address ?? "127.0.0.1" },
    },
  ) as unknown as IncomingMessage;
  let status = 0,
    output = "";
  const response = {
    writeHead(n: number) {
      status = n;
      return response;
    },
    end(text: string) {
      output = text;
    },
  } as unknown as ServerResponse;
  await tutorRequest(req, response);
  return { status, data: JSON.parse(output) };
}
it("keeps AI disabled without an opt-in and never contacts a provider", async () => {
  vi.stubEnv("ASCEND_OLLAMA", "");
  const fetch = vi.spyOn(globalThis, "fetch");
  expect(await request({ method: "GET" })).toEqual({
    status: 200,
    data: { available: false },
  });
  expect((await request()).status).toBe(503);
  expect(fetch).not.toHaveBeenCalled();
});
it("rejects foreign origins, host rebinding and non-loopback clients", async () => {
  const fetch = vi.spyOn(globalThis, "fetch");
  for (const options of [
    { origin: "https://attacker.example" },
    { host: "attacker.example:4173", origin: "http://attacker.example:4173" },
    { address: "192.168.1.10" },
  ])
    expect((await request(options)).status).toBe(403);
  expect(fetch).not.toHaveBeenCalled();
});
it("validates teaching mode and input limits", async () => {
  expect(
    (await request({ body: { ...body, mode: "Change grades" } })).status,
  ).toBe(400);
});
it("prevents selecting a remote upstream from configuration", async () => {
  vi.stubEnv("OLLAMA_URL", "https://example.com");
  const fetch = vi.spyOn(globalThis, "fetch");
  expect((await request()).status).toBe(502);
  expect(fetch).not.toHaveBeenCalled();
});
it("proxies a teaching request with bounded output and no grade access", async () => {
  const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        message: { content: "Think about the last valid index." },
      }),
      { status: 200 },
    ),
  );
  const result = await request();
  expect(result).toEqual({
    status: 200,
    data: { answer: "Think about the last valid index." },
  });
  const [url, options] = fetch.mock.calls[0];
  expect(String(url)).toBe("http://127.0.0.1:11434/api/chat");
  const sent = JSON.parse(String(options?.body));
  expect(sent.stream).toBe(false);
  expect(sent.options.num_predict).toBe(700);
  expect(sent.messages[0].content).toContain("no tools or database access");
  expect(sent.messages[1].content).toContain("Conceptual hint");
  expect((await request()).status).toBe(429);
});

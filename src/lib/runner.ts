import { z } from "zod";
import type { Case } from "./academy-content";
const resultSchema = z.object({
  type: z.literal("ascend-result"),
  id: z.string(),
  results: z
    .array(
      z.object({
        label: z.string().max(200),
        passed: z.boolean(),
        actual: z.string().max(2000).optional(),
      }),
    )
    .max(50),
  logs: z.array(z.string().max(1000)).max(50),
  elapsed: z.number().finite().nonnegative(),
  error: z.string().max(2000).optional(),
});
export type RunResult = z.infer<typeof resultSchema>;
export async function runCode(
  source: string,
  cases: Case[],
): Promise<RunResult> {
  if (source.length > 30000)
    return Promise.reject(Error("Code exceeds the 30,000 character limit."));
  const response = await fetch("/runner.html", {
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw Error("Unable to load the isolated runner.");
  const html = await response.text();
  return new Promise((resolve, reject) => {
    const frame = document.createElement("iframe"),
      id = crypto.randomUUID();
    frame.sandbox.add("allow-scripts");
    frame.srcdoc = html;
    frame.hidden = true;
    frame.title = "Isolated code execution";
    frame.referrerPolicy = "no-referrer";
    const cleanup = () => {
      clearTimeout(timer);
      removeEventListener("message", listener);
      frame.remove();
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(Error("Sandbox timed out or was blocked. Execution stopped."));
    }, 5000);
    const listener = (event: MessageEvent) => {
      if (event.source !== frame.contentWindow || event.origin !== "null")
        return;
      if (event.data?.type === "ascend-runner-ready") {
        frame.contentWindow?.postMessage(
          { type: "ascend-run", id, source, cases },
          "*",
        );
        return;
      }
      const parsed = resultSchema.safeParse(event.data);
      if (!parsed.success || parsed.data.id !== id) return;
      const result = parsed.data;
      if (
        !result.error &&
        (result.results.length !== cases.length ||
          result.results.some((r, i) => r.label !== cases[i].label))
      )
        return;
      cleanup();
      resolve(result);
    };
    addEventListener("message", listener);
    document.body.append(frame);
  });
}

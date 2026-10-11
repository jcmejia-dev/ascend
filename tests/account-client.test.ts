import { afterEach, it, expect, vi } from "vitest";
import { accountRequest, selectAccount } from "../src/lib/account";
import { saveAccount } from "../src/lib/account-storage";
import { emptyState } from "../src/lib/model";
const one = { id: "one", email: "one@example.com", name: "One" },
  two = { id: "two", email: "two@example.com", name: "Two" };
afterEach(() => {
  selectAccount(null);
  vi.unstubAllGlobals();
});
it("rejects an account response when logout happens while it is in flight", async () => {
  selectAccount(one);
  let finish!: (value: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise((resolve) => (finish = resolve))),
  );
  const pending = accountRequest("/api/workspace");
  selectAccount(null);
  finish(new Response(JSON.stringify({ state: emptyState(), files: [] })));
  await expect(pending).rejects.toThrow("account changed");
});
it("does not write private state when another account replaces the session during a save", async () => {
  selectAccount(one);
  let finish!: (value: Response) => void;
  const fetcher = vi.fn(() => new Promise((resolve) => (finish = resolve)));
  vi.stubGlobal("fetch", fetcher);
  const pending = saveAccount(emptyState(), [], []);
  selectAccount(two);
  finish(new Response(JSON.stringify({ state: emptyState(), files: [] })));
  await expect(pending).rejects.toThrow("account changed");
  expect(fetcher).toHaveBeenCalledTimes(1);
});

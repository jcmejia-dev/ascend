export type Account = { id: string; email: string; name: string };
let account: Account | null = null;
export const currentAccount = () => account;
export const selectAccount = (next: Account | null) => {
  account = next;
};
export async function accountRequest(
  url: string,
  method = "GET",
  payload?: unknown,
) {
  const requestAccount = account;
  const response = await fetch(url, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(account ? { "X-Ascend-User": account.id } : {}),
    },
    ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}),
    signal: AbortSignal.timeout(30000),
  });
  const data = await response.json();
  if (url === "/api/workspace" && account?.id !== requestAccount?.id)
    throw new Error("The account changed while this request was running.");
  if (!response.ok) {
    if ((response.status === 401 || response.status === 403) && account)
      window.dispatchEvent(new Event("ascend-session-ended"));
    throw new Error(data.error || "Unable to reach your account.");
  }
  return data;
}

import { accountRequest, currentAccount } from "./account";
import { validateState, validateFile, type State } from "./model";
import type { Attachment } from "./storage";
type Encoded = { id: string; name: string; type: string; data: string };
function decode(f: Encoded): Attachment {
  const data = Uint8Array.from(atob(f.data), (c) => c.charCodeAt(0));
  return {
    id: f.id,
    name: f.name,
    type: f.type,
    blob: new Blob([data], { type: f.type }),
  };
}
async function encode(f: Attachment): Promise<Encoded> {
  await validateFile(f.blob);
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("Cannot read attachment."));
    reader.readAsDataURL(f.blob);
  });
  return { id: f.id, name: f.name, type: f.type, data };
}
export async function accountWorkspace() {
  const data = await accountRequest("/api/workspace");
  return {
    state: validateState(data.state),
    files: (data.files as Encoded[]).map(decode),
  };
}
export async function saveAccount(
  next: State,
  files: Attachment[],
  remove: string[],
  replace = false,
  expected = next.revision,
) {
  const accountId = currentAccount()?.id;
  const current = await accountWorkspace();
  if (current.state.revision !== expected)
    throw new Error(
      "Another tab or device changed your data. Reload and try again.",
    );
  const attachments = replace
    ? files
    : [
        ...current.files.filter(
          (f) => !remove.includes(f.id) && !files.some((n) => n.id === f.id),
        ),
        ...files,
      ];
  const encoded = await Promise.all(attachments.map(encode));
  if (!accountId || currentAccount()?.id !== accountId)
    throw new Error("The account changed. Sign in and try again.");
  const saved = await accountRequest("/api/workspace", "PUT", {
    state: next,
    files: encoded,
    expectedRevision: expected,
  });
  return validateState(saved.state);
}

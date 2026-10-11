import { openDB, type DBSchema } from "idb";
import { currentAccount } from "./account";
import { accountWorkspace, saveAccount } from "./account-storage";
import { syncAwards } from "./education";
import { applyAssistance } from "./learning-assistant";
import {
  emptyState,
  pauseTimer,
  validateFile,
  validateState,
  type State,
} from "./model";
export type Attachment = { id: string; blob: Blob; name: string; type: string };
interface AscendDB extends DBSchema {
  state: { key: string; value: State };
  files: { key: string; value: Attachment };
}
const db = () =>
  openDB<AscendDB>("ascend", 1, {
    upgrade(db) {
      db.createObjectStore("state");
      db.createObjectStore("files", { keyPath: "id" });
    },
  });
export async function loadState() {
  if (currentAccount()) return (await accountWorkspace()).state;
  const d = await db();
  const s = await d.get("state", "main");
  return s ? validateState(s) : emptyState();
}
export async function saveState(
  next: State,
  files: Attachment[] = [],
  remove: string[] = [],
) {
  const accountId = currentAccount()?.id;
  next = syncAwards(validateState(applyAssistance(validateState(next))));
  for (const file of files) await validateFile(file.blob);
  if (currentAccount()?.id !== accountId)
    throw new Error("The account changed. Try again.");
  if (currentAccount()) return saveAccount(next, files, remove);
  const d = await db(),
    tx = d.transaction(["state", "files"], "readwrite");
  void tx.done.catch(() => {});
  const current = await tx.objectStore("state").get("main");
  if (current && current.revision !== next.revision) {
    tx.abort();
    throw new Error(
      "Another tab changed your data. Reload the latest records and try again.",
    );
  }
  const saved = { ...next, revision: next.revision + 1 };
  await tx.objectStore("state").put(saved, "main");
  for (const file of files) await tx.objectStore("files").put(file);
  for (const id of remove) await tx.objectStore("files").delete(id);
  await tx.done;
  return saved;
}
export async function getFile(id: string) {
  if (currentAccount())
    return (await accountWorkspace()).files.find((f) => f.id === id);
  return (await db()).get("files", id);
}
export async function exportBackup(state: State) {
  let files: Attachment[];
  if (currentAccount()) {
    const workspace = await accountWorkspace();
    state = workspace.state;
    files = workspace.files;
  } else files = await (await db()).getAll("files");
  const encoded = await Promise.all(
    files.map(async (f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      data: await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error("Unable to read attachment."));
        r.readAsDataURL(f.blob);
      }),
    })),
  );
  return JSON.stringify(
    {
      format: "ascend-backup",
      version: 2,
      exportedAt: new Date().toISOString(),
      state: { ...state, timer: state.timer ? pauseTimer(state.timer) : null },
      files: encoded,
    },
    null,
    2,
  );
}
export async function parseBackup(text: string) {
  if (text.length > 150 * 1024 * 1024)
    throw new Error("Backup exceeds the 150 MB limit.");
  const raw = JSON.parse(text);
  if (
    raw.format !== "ascend-backup" ||
    ![1, 2].includes(raw.version) ||
    !Array.isArray(raw.files)
  )
    throw new Error("Not a supported ASCEND v1/v2 backup.");
  const state = validateState(raw.state),
    files: Attachment[] = [],
    ids = new Set<string>();
  if (raw.files.length > 5000) throw new Error("Too many attachments.");
  for (const f of raw.files) {
    if (
      typeof f.id !== "string" ||
      typeof f.name !== "string" ||
      typeof f.type !== "string" ||
      typeof f.data !== "string" ||
      ids.has(f.id) ||
      !/^data:(application\/pdf|image\/(png|jpeg|webp));base64,/.test(f.data)
    )
      throw new Error("Invalid backup attachment.");
    ids.add(f.id);
    const bytes = Uint8Array.from(atob(f.data.split(",")[1]), (c) =>
      c.charCodeAt(0),
    );
    const blob = new Blob([bytes], { type: f.type });
    await validateFile(blob);
    files.push({ id: f.id, name: f.name, type: f.type, blob });
  }
  for (const list of Object.values(state.records))
    for (const r of list)
      for (const key of ["fileId", "imageId", "pdfId"])
        if (r[key] && !ids.has(String(r[key])))
          throw new Error("Backup is missing an attachment.");
  if (state.timer)
    state.timer = pauseTimer({
      ...state.timer,
      status: "paused",
      startedAt: null,
    });
  return { state, files };
}
export async function restoreBackup(
  state: State,
  files: Attachment[],
  expectedRevision: number,
) {
  const accountId = currentAccount()?.id;
  validateState(state);
  for (const file of files) await validateFile(file.blob);
  if (currentAccount()?.id !== accountId)
    throw new Error("The account changed. Try again.");
  if (currentAccount())
    return saveAccount(state, files, [], true, expectedRevision);
  const d = await db(),
    tx = d.transaction(["state", "files"], "readwrite");
  void tx.done.catch(() => {});
  const current = await tx.objectStore("state").get("main");
  if (current && current.revision !== expectedRevision) {
    tx.abort();
    throw new Error("Data changed in another tab. Reload before importing.");
  }
  const saved = { ...state, revision: expectedRevision + 1 };
  await tx.objectStore("files").clear();
  for (const f of files) await tx.objectStore("files").put(f);
  await tx.objectStore("state").put(saved, "main");
  await tx.done;
  return saved;
}
export function download(
  content: Blob | string,
  name: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(
    typeof content === "string" ? new Blob([content], { type }) : content,
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

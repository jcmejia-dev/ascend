"use client";
import { useState, type FormEvent, useRef } from "react";
import {
  Download,
  Upload,
  ShieldCheck,
  Smartphone,
  HardDrive,
  RefreshCw,
  Bell,
  Save,
} from "lucide-react";
import {
  VERSION,
  dateKey,
  hours,
  progress,
  validateState,
  validateFile,
  type State,
} from "@/lib/model";
import {
  download,
  exportBackup,
  parseBackup,
  type Attachment,
} from "@/lib/storage";
import { SectionHead } from "./ui";
import { currentAccount } from "@/lib/account";
export default function Settings({
  state,
  save,
  restore,
  pwa,
}: {
  state: State;
  save: (s: State) => Promise<void>;
  restore: (s: State, files: Attachment[]) => Promise<void>;
  pwa: {
    waiting: ServiceWorker | null;
    canInstall: boolean;
    installApp: () => Promise<void>;
    update: () => void;
  };
}) {
  const [profile, setProfile] = useState(state.profile),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [persisted, setPersisted] = useState<string>(""),
    input = useRef<HTMLInputElement>(null);
  async function task(fn: () => Promise<void>, success: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
      setMessage(success);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    await task(async () => {
      validateState({ ...state, profile });
      await save({ ...state, profile });
    }, "Profile saved.");
  }
  async function summary() {
    const date = dateKey(new Date(), state.profile.timezone);
    const text = [
      `# ${state.profile.name} — Learning summary`,
      `Generated ${date}`,
      state.profile.title,
      `Target role: ${state.profile.role}`,
      "",
      `Study hours: ${hours(state.records.sessions).toFixed(1)}`,
      `Practice hours: ${hours(state.records.practice).toFixed(1)}`,
      "",
      "## Courses",
      ...state.records.courses.map(
        (c) =>
          `- ${c.title} (${c.provider || "Self-directed"}) — ${c.status}, ${progress(c)}%${c.completionDate ? `, completed ${c.completionDate}` : ""}`,
      ),
      "",
      "## Shareable certificate records",
      ...state.records.certificates
        .filter((c) => c.visibility === "Include in learning summary")
        .map(
          (c) =>
            `- ${c.title} — ${c.organization}, issued ${c.issueDate}. ${c.verificationUrl || ""} (Recorded; independently unverified)`,
        ),
      "",
      "## Completed projects",
      ...state.records.projects
        .filter((p) => p.status === "Completed")
        .map(
          (p) =>
            `- ${p.title} — ${p.technologies || ""}\n  ${p.repositoryUrl || ""}\n  ${p.description || ""}\n  AI assistance: ${p.aiNotes || "Not recorded"}`,
        ),
      "",
      "## Self-assessed skills",
      ...state.records.skills.map(
        (s) => `- ${s.title}: ${s.confidence || "Exploring"}`,
      ),
      "",
      "This summary reflects user-entered records and does not verify credentials or prove mastery.",
    ].join("\n");
    download(text, `ascend-learning-summary-${date}.md`, "text/markdown");
  }
  return (
    <div className="settings-grid">
      <section className="panel">
        <SectionHead
          title="Your profile"
          subtitle="Make this space your own."
        />
        <form onSubmit={submit} className="settings-form">
          <div className="avatar-settings">
            <div className="avatar large">
              {profile.avatar ? (
                <img src={profile.avatar} alt="Your avatar" />
              ) : (
                profile.name.slice(0, 1)
              )}
            </div>
            <label className="button">
              Upload avatar
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  void task(async () => {
                    await validateFile(file);
                    const bitmap = await createImageBitmap(file),
                      canvas = document.createElement("canvas");
                    canvas.width = 256;
                    canvas.height = 256;
                    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, 256, 256);
                    bitmap.close();
                    setProfile({
                      ...profile,
                      avatar: canvas.toDataURL("image/jpeg", 0.8),
                    });
                  }, "Avatar ready. Save your profile to keep it.");
                }}
              />
            </label>
            <button
              type="button"
              className="text-button"
              onClick={() => setProfile({ ...profile, avatar: "" })}
            >
              Remove
            </button>
          </div>
          <div className="form-grid">
            <label>
              Name
              <input
                required
                maxLength={100}
                value={profile.name}
                onChange={(e) =>
                  setProfile({ ...profile, name: e.target.value })
                }
              />
            </label>
            <label>
              Professional title
              <input
                maxLength={200}
                value={profile.title}
                onChange={(e) =>
                  setProfile({ ...profile, title: e.target.value })
                }
              />
            </label>
            <label className="span-2">
              Career goals
              <textarea
                rows={3}
                maxLength={10000}
                value={profile.careerGoals}
                onChange={(e) =>
                  setProfile({ ...profile, careerGoals: e.target.value })
                }
              />
            </label>
            <label>
              Preferred learning hours
              <input
                maxLength={200}
                value={profile.learningHours}
                onChange={(e) =>
                  setProfile({ ...profile, learningHours: e.target.value })
                }
              />
            </label>
            <label>
              Time zone
              <input
                required
                value={profile.timezone}
                placeholder="Asia/Manila"
                onChange={(e) =>
                  setProfile({ ...profile, timezone: e.target.value })
                }
              />
              <small>IANA time zone, e.g. Asia/Manila.</small>
            </label>
            <label>
              Weekly study goal (hours)
              <input
                type="number"
                min={1}
                max={168}
                step="any"
                required
                value={profile.weeklyHours}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    weeklyHours: Number(e.target.value),
                  })
                }
              />
            </label>
            <label>
              Theme
              <select
                value={profile.theme}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    theme: e.target.value as State["profile"]["theme"],
                  })
                }
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="system">System</option>
              </select>
            </label>
          </div>
          <button className="button primary" disabled={busy}>
            <Save size={16} />
            Save profile
          </button>
        </form>
      </section>
      <div className="settings-side">
        <section className="panel">
          <SectionHead title="Backup & data" />
          <p className="muted">
            {currentAccount()
              ? "Your records and attachments are stored in your account on the ASCEND server. Export backups regularly. Account edits require a connection."
              : "Your records and attachments are stored in this browser on this device. Export backups regularly; clearing site data or losing your device can remove them."}
          </p>
          <div className="settings-buttons">
            <button
              className="button"
              disabled={busy}
              onClick={() =>
                void task(
                  async () =>
                    download(
                      await exportBackup(state),
                      `ascend-backup-${dateKey()}.json`,
                    ),
                  "Backup exported, including certificate files.",
                )
              }
            >
              <Download size={16} />
              Export full backup
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() => input.current?.click()}
            >
              <Upload size={16} />
              Restore backup
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() =>
                void task(
                  summary,
                  "Learning summary exported. Private certificate records were excluded.",
                )
              }
            >
              <Download size={16} />
              Export learning summary
            </button>
            <input
              ref={input}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                void task(async () => {
                  if (file.size > 150 * 1024 * 1024)
                    throw new Error("Backup exceeds 150 MB.");
                  const backup = await parseBackup(await file.text());
                  if (
                    !confirm(
                      `Replace current data with this backup? ${backup.state.records.courses.length} courses, ${backup.state.records.certificates.length} certificates, ${backup.files.length} attachments. Export your current data first.`,
                    )
                  )
                    return;
                  await restore(backup.state, backup.files);
                  setProfile(backup.state.profile);
                }, "Backup import finished.");
              }}
            />
          </div>
          <button
            className="text-button"
            onClick={() =>
              void task(async () => {
                if (!navigator.storage?.persist)
                  throw new Error(
                    "Persistent storage requests are unavailable in this browser.",
                  );
                const kept = await navigator.storage.persist();
                setPersisted(
                  kept
                    ? "Persistent storage granted. Backups are still recommended."
                    : "Browser declined persistent storage. Keep regular backups.",
                );
              }, "Storage preference checked.")
            }
          >
            <HardDrive size={16} />
            Request persistent storage
          </button>
          {persisted && <p className="notice">{persisted}</p>}
        </section>
        <section className="panel">
          <SectionHead title="ASCEND on your phone" />
          <p className="muted">
            Deploy on HTTPS. Open in Android Chrome, then use the browser menu →
            Add to home screen → Install. After the first online visit, the app
            shell is available offline.
          </p>
          {pwa.canInstall && (
            <button
              className="button primary"
              onClick={() => void pwa.installApp()}
            >
              <Smartphone size={16} />
              Install ASCEND
            </button>
          )}
          <div className="split version">
            <span>Version {VERSION}</span>
            {pwa.waiting ? (
              <button
                className="button"
                onClick={() => {
                  if (
                    confirm(
                      "Apply the new app version? Save any unfinished work first.",
                    )
                  )
                    pwa.update();
                }}
              >
                <RefreshCw size={16} />
                Update available
              </button>
            ) : (
              <span className="muted">No update detected</span>
            )}
          </div>
        </section>
        <section className="panel">
          <SectionHead title="Notifications" />
          <p className="muted">
            In-app reminders work while ASCEND is open. Browser notifications
            need permission and are also delivered only while this app is
            running. Closed-app push is not implemented.
          </p>
          <button
            className="button"
            onClick={() =>
              void task(async () => {
                if (!("Notification" in window))
                  throw new Error(
                    "Browser notifications are unavailable. In-app reminders still work.",
                  );
                if (!profile.notifications) {
                  const permission = await Notification.requestPermission();
                  if (permission !== "granted")
                    throw new Error("Notification permission was not granted.");
                }
                const next = {
                  ...profile,
                  notifications: !profile.notifications,
                };
                await save({ ...state, profile: next });
                setProfile(next);
              }, "Notification preference saved.")
            }
          >
            <Bell size={16} />
            {profile.notifications ? "Disable" : "Enable"} browser notifications
          </button>
        </section>
        <section className="panel privacy-note">
          <ShieldCheck size={20} />
          <div>
            <strong>
              {currentAccount() ? "Your private account" : "Local workspace"}
            </strong>
            <p>
              {currentAccount()
                ? "Your account has a separate server workspace. Other users cannot access it through the app. Server administrators manage its storage; records and files are not encrypted at rest."
                : "Files stay in IndexedDB. Device access and browser security protect your data; ASCEND does not encrypt local records."}
            </p>
          </div>
        </section>
      </div>
      {(error || message) && (
        <div
          className={
            error ? "error settings-feedback" : "notice settings-feedback"
          }
          role={error ? "alert" : "status"}
        >
          {error || message}
        </div>
      )}
    </div>
  );
}

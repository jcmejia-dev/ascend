"use client";
import { useState, type FormEvent } from "react";
import { Upload, Save } from "lucide-react";
import { forms, names, optionsFor } from "@/lib/forms";
import {
  dateKey,
  validateRecord,
  validateFile,
  type Kind,
  type RecordItem,
  type State,
} from "@/lib/model";
import type { Attachment } from "@/lib/storage";
import { Modal } from "./ui";
export default function Editor({
  kind,
  item,
  state,
  onClose,
  onSave,
}: {
  kind: Kind;
  item?: Partial<RecordItem>;
  state: State;
  onClose: () => void;
  onSave: (
    r: RecordItem,
    files: Attachment[],
    remove: string[],
  ) => Promise<void>;
}) {
  const defaults = Object.fromEntries(
    forms[kind].map((f) => [
      f.key,
      f.default ??
        (f.type === "date" &&
        ["date", "issueDate", "startDate", "enrollmentDate"].includes(f.key)
          ? dateKey(new Date(), state.profile.timezone)
          : f.type === "checkbox"
            ? false
            : ""),
    ]),
  );
  const [values, setValues] = useState<
    Record<string, string | number | boolean | undefined>
  >({ ...defaults, ...item });
  const [uploads, setUploads] = useState<Record<string, File>>({});
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const r = {
        ...values,
        id: item?.id || crypto.randomUUID(),
        title: String(values.title || "").trim(),
        createdAt: item?.createdAt || now,
        updatedAt: now,
      } as RecordItem;
      const files: Attachment[] = [],
        remove: string[] = [];
      for (const key of removed) {
        if (item?.[key]) remove.push(String(item[key]));
        delete r[key];
        delete r[key.replace("Id", "Name")];
      }
      for (const [key, file] of Object.entries(uploads)) {
        await validateFile(file);
        if (item?.[key]) remove.push(String(item[key]));
        const id = crypto.randomUUID();
        files.push({ id, blob: file, type: file.type, name: file.name });
        r[key] = id;
        r[key.replace("Id", "Name")] = file.name;
      }
      if (
        kind === "milestones" &&
        r.status === "Completed" &&
        !r.completionDate
      )
        r.completionDate = dateKey(new Date(), state.profile.timezone);
      validateRecord(kind, r);
      await onSave(r, files, remove);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={`${item?.id ? "Edit" : "Add"} ${names[kind]}`}
      onClose={() => {
        if (
          !busy &&
          (!Object.keys(uploads).length ||
            confirm("Discard this unsaved attachment?"))
        )
          onClose();
      }}
      wide
    >
      <form onSubmit={submit} className="record-form">
        <div className="form-grid">
          {forms[kind].map((field) => (
            <label
              key={field.key}
              className={`${field.wide ? "span-2" : ""} ${field.type === "checkbox" ? "checkbox-field" : ""}`}
            >
              <span>
                {field.label}
                {field.required && <span className="required"> *</span>}
              </span>
              {field.type === "textarea" ? (
                <textarea
                  aria-label={field.label}
                  aria-describedby={
                    field.help ? `help-${field.key}` : undefined
                  }
                  rows={3}
                  maxLength={10000}
                  value={String(values[field.key] ?? "")}
                  onChange={(e) =>
                    setValues({ ...values, [field.key]: e.target.value })
                  }
                />
              ) : field.type === "select" ? (
                <select
                  aria-label={field.label}
                  aria-describedby={
                    field.help ? `help-${field.key}` : undefined
                  }
                  value={String(values[field.key] ?? "")}
                  required={field.required}
                  onChange={(e) =>
                    setValues({ ...values, [field.key]: e.target.value })
                  }
                >
                  <option value="">{field.link ? "None" : "Choose…"}</option>
                  {optionsFor(field, state).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : field.type === "checkbox" ? (
                <input
                  type="checkbox"
                  aria-label={field.label}
                  aria-describedby={
                    field.help ? `help-${field.key}` : undefined
                  }
                  checked={Boolean(values[field.key])}
                  onChange={(e) =>
                    setValues({ ...values, [field.key]: e.target.checked })
                  }
                />
              ) : (
                <input
                  aria-label={field.label}
                  aria-describedby={
                    field.help ? `help-${field.key}` : undefined
                  }
                  type={field.type || "text"}
                  required={field.required}
                  min={field.type === "number" ? (field.min ?? 0) : undefined}
                  max={field.max}
                  step={
                    field.type === "number"
                      ? ["totalLessons", "completedLessons"].includes(field.key)
                        ? 1
                        : "any"
                      : undefined
                  }
                  maxLength={field.type === "text" ? 300 : undefined}
                  value={String(values[field.key] ?? "")}
                  onChange={(e) =>
                    setValues({
                      ...values,
                      [field.key]:
                        field.type === "number" && e.target.value !== ""
                          ? Number(e.target.value)
                          : e.target.value,
                    })
                  }
                />
              )}{" "}
              {field.help && (
                <small id={`help-${field.key}`}>{field.help}</small>
              )}
            </label>
          ))}
        </div>
        {["certificates", "projects"].includes(kind) && (
          <fieldset className="attachment-fields">
            <legend>Attachments · private on this device</legend>
            {(kind === "certificates"
              ? [
                  {
                    key: "imageId",
                    label: "Certificate image",
                    accept: "image/png,image/jpeg,image/webp",
                  },
                  {
                    key: "pdfId",
                    label: "PDF certificate",
                    accept: "application/pdf",
                  },
                ]
              : [
                  {
                    key: "imageId",
                    label: "Project screenshot",
                    accept: "image/png,image/jpeg,image/webp",
                  },
                  {
                    key: "pdfId",
                    label: "Documentation PDF",
                    accept: "application/pdf",
                  },
                ]
            ).map((a) => (
              <div className="upload-box" key={a.key}>
                <label>
                  <Upload size={18} />
                  <span>{a.label}</span>
                  <input
                    type="file"
                    accept={a.accept}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploads({ ...uploads, [a.key]: file });
                        setRemoved(
                          new Set([...removed].filter((k) => k !== a.key)),
                        );
                      }
                    }}
                  />
                </label>
                <small>
                  {uploads[a.key]?.name ||
                    (!removed.has(a.key) &&
                      String(item?.[a.key.replace("Id", "Name")] || "")) ||
                    "PDF, PNG, JPEG, WebP · max 10 MB"}
                </small>
                {item?.[a.key] && !removed.has(a.key) && (
                  <button
                    type="button"
                    className="text-button danger"
                    onClick={() => setRemoved(new Set([...removed, a.key]))}
                  >
                    Remove existing file
                  </button>
                )}
              </div>
            ))}
          </fieldset>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <footer className="modal-footer">
          <button
            type="button"
            className="button"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            <Save size={16} />
            {busy ? "Saving…" : "Save record"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}

"use client";
import { useEffect, useState } from "react";
import {
  Download,
  ExternalLink,
  Copy,
  FileText,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { getFile, download, type Attachment } from "@/lib/storage";
import {
  certificateStatus,
  safeUrl,
  type RecordItem,
  type Kind,
  type State,
} from "@/lib/model";
import { forms, optionsFor } from "@/lib/forms";
import { Modal, Badge } from "./ui";
export function FilePreview({
  id,
  compact = false,
}: {
  id: string;
  compact?: boolean;
}) {
  const [file, setFile] = useState<Attachment>(),
    [url, setUrl] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    let objectUrl = "",
      cancelled = false;
    getFile(id)
      .then((f) => {
        if (cancelled) return;
        if (!f) {
          setError("Attachment not found. Restore a complete backup.");
          return;
        }
        setFile(f);
        objectUrl = URL.createObjectURL(f.blob);
        setUrl(objectUrl);
      })
      .catch(() => setError("Unable to open attachment."));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);
  if (error) return <p className="error">{error}</p>;
  if (!file || !url)
    return <div className="file-placeholder">Loading attachment…</div>;
  return (
    <div className={compact ? "file-preview compact" : "file-preview"}>
      {file.type.startsWith("image/") ? (
        <img src={url} alt={file.name} />
      ) : compact ? (
        <div className="pdf-thumb">
          <FileText size={32} />
          <span>PDF certificate</span>
        </div>
      ) : (
        <>
          <iframe src={url} title={file.name} sandbox="allow-same-origin" />
          <p className="muted">
            If your browser cannot preview PDFs, download the file to view it.
          </p>
        </>
      )}
      {!compact && (
        <button
          className="button"
          onClick={() => download(file.blob, file.name)}
        >
          <Download size={16} />
          Download {file.name}
        </button>
      )}
    </div>
  );
}
export default function Viewer({
  kind,
  item,
  state,
  onClose,
  onEdit,
}: {
  kind: Kind;
  item: RecordItem;
  state: State;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [copied, setCopied] = useState(false),
    [copyError, setCopyError] = useState(""),
    [fullscreen, setFullscreen] = useState(false);
  const url = safeUrl(item.verificationUrl);
  return (
    <Modal title={item.title} onClose={onClose} wide fullscreen={fullscreen}>
      <div className="detail-view">
        {["certificates", "projects"].includes(kind) && (
          <button
            className="button viewer-expand"
            onClick={() => setFullscreen(!fullscreen)}
          >
            {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}{" "}
            {fullscreen ? "Exit full screen" : "Full-screen viewer"}
          </button>
        )}
        {kind === "certificates" && (
          <div className="viewer-summary">
            <Badge>{certificateStatus(item)}</Badge>
            <span className="muted">
              Recorded credential · independently unverified
            </span>
          </div>
        )}
        {["imageId", "pdfId"].map((k) =>
          item[k] ? <FilePreview key={k} id={String(item[k])} /> : null,
        )}
        <dl className="detail-grid">
          {item.completionHistory && (
            <div className="span-2">
              <dt>Milestone history</dt>
              <dd>{String(item.completionHistory)}</dd>
            </div>
          )}
          {forms[kind]
            .filter(
              (f) =>
                item[f.key] !== undefined &&
                item[f.key] !== "" &&
                f.key !== "title",
            )
            .map((f) => (
              <div key={f.key} className={f.wide ? "span-2" : ""}>
                <dt>{f.label}</dt>
                <dd>
                  {f.type === "checkbox" ? (
                    item[f.key] ? (
                      "Yes"
                    ) : (
                      "No"
                    )
                  ) : f.link ? (
                    optionsFor(f, state).find((o) => o.value === item[f.key])
                      ?.label || "Removed record"
                  ) : f.type === "url" ? (
                    safeUrl(item[f.key]) ? (
                      <a
                        href={safeUrl(item[f.key])}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {String(item[f.key])}
                        <ExternalLink size={14} />
                      </a>
                    ) : (
                      "Invalid link"
                    )
                  ) : (
                    String(item[f.key])
                  )}
                </dd>
              </div>
            ))}
        </dl>
        {url && (
          <button
            className="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
              } catch {
                setCopyError(
                  "Clipboard unavailable. Select and copy the verification link above.",
                );
              }
            }}
          >
            <Copy size={16} />
            {copied ? "Link copied" : "Copy verification link"}
          </button>
        )}
        {copyError && <p role="alert">{copyError}</p>}
      </div>
      <footer className="modal-footer">
        <button className="button primary" onClick={onEdit}>
          Edit details
        </button>
      </footer>
    </Modal>
  );
}

"use client";
import { useState } from "react";
import {
  Search,
  Plus,
  ArrowUpRight,
  MoreHorizontal,
  BookOpen,
  Award,
  FolderGit2,
  Code2,
  Archive,
  Trash2,
  Pencil,
  Check,
} from "lucide-react";
import {
  certificateStatus,
  dateKey,
  goalProgress,
  hours,
  progress,
  safeUrl,
  type Kind,
  type RecordItem,
  type State,
} from "@/lib/model";
import { catalog } from "@/lib/catalog";
import { names } from "@/lib/forms";
import { Badge, Empty, Meter, Modal, TextLink } from "./ui";
import { FilePreview } from "./viewer";
export default function Records({
  kind,
  state,
  add,
  edit,
  view,
  remove,
  patch,
}: {
  kind: Kind;
  state: State;
  add: (k: Kind, item?: Partial<RecordItem>) => void;
  edit: (k: Kind, r: RecordItem) => void;
  view: (k: Kind, r: RecordItem) => void;
  remove: (k: Kind, r: RecordItem) => void;
  patch: (k: Kind, r: RecordItem) => Promise<void>;
}) {
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("All"),
    [sort, setSort] = useState("Newest"),
    [showCatalog, setCatalog] = useState(false),
    [menu, setMenu] = useState<RecordItem | null>(null),
    [error, setError] = useState("");
  const today = dateKey(new Date(), state.profile.timezone);
  const statusOf = (r: RecordItem) =>
    kind === "certificates"
      ? certificateStatus(r, today)
      : String(r.status || r.confidence || r.type || "");
  const options = [
    ...new Set(state.records[kind].map(statusOf).filter(Boolean)),
  ];
  const list = state.records[kind]
    .filter(
      (r) =>
        (filter === "Archived" ? r.archived : !r.archived) &&
        (filter === "All" || filter === "Archived" || statusOf(r) === filter) &&
        `${r.title} ${r.provider || r.organization || ""} ${r.skills || ""} ${r.language || ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "Title"
        ? a.title.localeCompare(b.title)
        : sort === "Target date"
          ? String(a.targetDate || a.dueDate || "9999").localeCompare(
              String(b.targetDate || b.dueDate || "9999"),
            )
          : sort === "Issue date"
            ? String(b.issueDate || "").localeCompare(String(a.issueDate || ""))
            : b.createdAt.localeCompare(a.createdAt),
    );
  const icon =
    kind === "courses"
      ? BookOpen
      : kind === "certificates"
        ? Award
        : kind === "projects"
          ? FolderGit2
          : Code2;
  const Icon = icon;
  const update = async (r: RecordItem) => {
    setError("");
    try {
      await patch(kind, r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update.");
    }
  };
  return (
    <>
      <div className="toolbar">
        <label className="search-input">
          <Search size={17} />
          <input
            aria-label={`Search ${kind}`}
            placeholder={`Search ${kind}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label="Filter status"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option>All</option>
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
          {kind === "courses" && <option>Archived</option>}
        </select>
        <select
          aria-label="Sort records"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option>Newest</option>
          <option>Title</option>
          {["courses", "goals"].includes(kind) && <option>Target date</option>}
          {kind === "certificates" && <option>Issue date</option>}
        </select>
        {kind === "courses" && (
          <button className="button" onClick={() => setCatalog(true)}>
            Browse catalog
          </button>
        )}
        <button className="button primary" onClick={() => add(kind)}>
          <Plus size={16} />
          Add {names[kind]}
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {list.length ? (
        <div
          className={`record-grid ${kind === "certificates" ? "certificate-grid" : ""}`}
        >
          {list.map((r) => (
            <article
              key={r.id}
              className={`record-card ${kind === "certificates" ? "certificate-card" : ""}`}
            >
              {kind === "certificates" && (
                <button
                  className="certificate-thumbnail"
                  onClick={() => view(kind, r)}
                  aria-label={`View ${r.title}`}
                >
                  {r.imageId ? (
                    <FilePreview compact id={String(r.imageId)} />
                  ) : r.pdfId ? (
                    <FilePreview compact id={String(r.pdfId)} />
                  ) : (
                    <div className="certificate-art">
                      <Award size={36} />
                      <span>CREDENTIAL RECORD</span>
                      <strong>{r.title}</strong>
                      <small>{String(r.organization || "")}</small>
                    </div>
                  )}
                </button>
              )}
              <div className="record-card-body">
                <div className="split">
                  <div className="record-glyph">
                    <Icon size={19} />
                  </div>
                  <button
                    className="icon-button"
                    aria-label={`Actions for ${r.title}`}
                    onClick={() => setMenu(r)}
                  >
                    <MoreHorizontal size={20} />
                  </button>
                </div>
                <Badge>{statusOf(r) || "Recorded"}</Badge>
                {r.assistantManaged && (
                  <p className="assistant-record-note">
                    Added by your learning assistant · editable
                  </p>
                )}
                <button className="record-title" onClick={() => view(kind, r)}>
                  {r.title}
                </button>
                <p className="muted record-subtitle">
                  {String(
                    r.provider ||
                      r.organization ||
                      r.language ||
                      r.technologies ||
                      r.metric ||
                      "",
                  )}
                </p>
                {kind === "courses" && (
                  <>
                    <div className="split small">
                      <span>
                        {Number(r.totalLessons) > 0
                          ? `${r.completedLessons || 0} of ${r.totalLessons} lessons`
                          : r.assistantManaged
                            ? "External progress · confirm with provider"
                            : "Manual progress"}
                      </span>
                      <strong>{progress(r)}%</strong>
                    </div>
                    <Meter value={progress(r)} label={`${r.title} progress`} />
                    <div className="split small">
                      <span>
                        {hours(
                          state.records.sessions.filter(
                            (s) => s.courseId === r.id,
                          ),
                        ).toFixed(1)}{" "}
                        study hours
                      </span>
                      <span>
                        {r.targetDate
                          ? `Target ${r.targetDate}`
                          : "No target date"}
                      </span>
                    </div>
                    <div className="card-actions">
                      <button
                        className="button small-button"
                        disabled={
                          !Number(r.totalLessons) ||
                          Number(r.completedLessons) >=
                            Number(r.totalLessons) ||
                          r.status === "Completed"
                        }
                        onClick={() =>
                          void update({
                            ...r,
                            completedLessons:
                              Number(r.completedLessons || 0) + 1,
                            lastLessonAt: new Date().toISOString(),
                            status:
                              r.status === "Not Started"
                                ? "In Progress"
                                : r.status,
                          })
                        }
                      >
                        <Check size={14} />
                        Complete lesson
                      </button>
                      <TextLink url={safeUrl(r.url)}>Open course</TextLink>
                    </div>
                  </>
                )}
                {kind === "goals" && (
                  <>
                    <div className="split">
                      <strong>
                        {goalProgress(r, state).toFixed(1)} /{" "}
                        {String(r.targetValue)}
                      </strong>
                      <span className="muted">
                        Due {String(r.dueDate || "—")}
                      </span>
                    </div>
                    <Meter
                      value={
                        (goalProgress(r, state) / Number(r.targetValue)) * 100
                      }
                      label={r.title}
                    />
                    <small className="muted">
                      {r.metric === "Manual"
                        ? "Self-reported progress"
                        : "Calculated from saved activity"}
                    </small>
                  </>
                )}
                {kind === "certificates" && (
                  <div className="split small">
                    <span>Issued {String(r.issueDate || "—")}</span>
                    <span>
                      {r.expirationDate
                        ? `Expires ${r.expirationDate}`
                        : "No expiration recorded"}
                    </span>
                  </div>
                )}
                {kind === "practice" && (
                  <>
                    <div className="split small">
                      <span>{String(r.date || "")}</span>
                      <strong>{String(r.minutes || 0)} min</strong>
                    </div>
                    <div className="assistance-label">
                      {String(r.aiAssistance || "Not recorded")}
                    </div>
                  </>
                )}
                {kind === "sessions" && (
                  <div className="split">
                    <span>{String(r.date || "")}</span>
                    <strong>{String(r.minutes || 0)} minutes</strong>
                  </div>
                )}
                {kind === "projects" && (
                  <div className="card-actions">
                    <TextLink url={safeUrl(r.repositoryUrl)}>
                      Repository
                    </TextLink>
                    <TextLink url={safeUrl(r.demoUrl)}>Live demo</TextLink>
                  </div>
                )}
                {r.description && (
                  <p className="record-description">{String(r.description)}</p>
                )}
                {r.skills && (
                  <div className="tags">
                    {String(r.skills)
                      .split(",")
                      .filter(Boolean)
                      .slice(0, 4)
                      .map((s, i) => (
                        <span key={i}>{s.trim()}</span>
                      ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="panel">
          <Empty
            title={
              search || filter !== "All"
                ? "No matching records"
                : `Your ${kind} start here`
            }
            description={
              search || filter !== "All"
                ? "Try another search or filter."
                : `Add your first ${names[kind]} to start building your learning history.`
            }
            action={() => add(kind)}
            label={`Add ${names[kind]}`}
          />
        </section>
      )}
      {menu && (
        <Modal title={menu.title} onClose={() => setMenu(null)}>
          <div className="action-menu">
            <button
              onClick={() => {
                view(kind, menu);
                setMenu(null);
              }}
            >
              <ArrowUpRight size={18} />
              View details
            </button>
            <button
              onClick={() => {
                edit(kind, menu);
                setMenu(null);
              }}
            >
              <Pencil size={18} />
              Edit record
            </button>
            {kind === "courses" && (
              <button
                onClick={() => {
                  void update({ ...menu, archived: !menu.archived });
                  setMenu(null);
                }}
              >
                <Archive size={18} />
                {menu.archived ? "Restore from archive" : "Archive course"}
              </button>
            )}
            <button
              className="danger"
              onClick={() => {
                remove(kind, menu);
                setMenu(null);
              }}
            >
              <Trash2 size={18} />
              Delete record
            </button>
          </div>
        </Modal>
      )}
      {showCatalog && (
        <Modal
          title="Find your next course"
          onClose={() => setCatalog(false)}
          wide
        >
          <div className="catalog-intro">
            <p>
              Optional resources, separate from your enrollments. Check the
              provider’s current requirements before starting.
            </p>
            <small>
              Provider information reviewed October 11, 2026. Difficulty is an
              editorial estimate.
            </small>
          </div>
          <div className="catalog-grid">
            {catalog.map((c) => (
              <article key={c.provider}>
                <div className="eyebrow">{c.provider}</div>
                <h3>{c.title}</h3>
                <p>{c.topics}</p>
                <Badge>{c.difficulty}</Badge>
                <dl>
                  <dt>Cost</dt>
                  <dd>{c.cost}</dd>
                  <dt>Certificate</dt>
                  <dd>{c.certificate}</dd>
                </dl>
                <div className="split">
                  <TextLink url={c.source}>Provider details</TextLink>
                  <button
                    className="button small-button"
                    onClick={() => {
                      setCatalog(false);
                      add("courses", {
                        title: c.title,
                        provider: c.provider,
                        url: c.url,
                        skills: c.topics,
                        difficulty: c.difficulty.startsWith("Intermediate")
                          ? "Intermediate"
                          : "Beginner",
                        status: "Not Started",
                        cost: 0,
                        notes: `Catalog: ${c.cost}. ${c.certificate} Check current provider terms.`,
                        certificateAvailability:
                          c.certificate.startsWith("No") ||
                          c.certificate.startsWith("Learning resource")
                            ? "No certificate"
                            : "Available — see provider requirements",
                      });
                    }}
                  >
                    <Plus size={14} />
                    Add to tracker
                  </button>
                </div>
              </article>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}

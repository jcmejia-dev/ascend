"use client";
import { useState, useEffect, useRef } from "react";
import { ArrowUpRight, BookOpen, Search } from "lucide-react";
import { recommendResources, type Resource } from "@/lib/discovery";
import { dateKey } from "@/lib/model";
import { Modal } from "./ui";
import { accountRequest } from "@/lib/account";
import { liveCourseSchema } from "@/lib/assistant-schema";
import { allTracks, emptyEducation } from "@/lib/education";
import {
  useEducation,
  Feedback,
  Chips,
  type LearningProps,
} from "./education-shared";
export default function Discover(props: LearningProps) {
  const { e, commit, message, busy } = useEducation(props),
    [query, setQuery] = useState(""),
    [provider, setProvider] = useState("All providers"),
    [selected, setSelected] = useState<Resource | null>(null);
  const [onlineBusy, setOnlineBusy] = useState(false),
    [onlineMessage, setOnlineMessage] = useState("");
  const current = useRef(props);
  current.current = props;
  const searchQuery = useRef(query);
  searchQuery.current = query;
  async function searchOnline() {
    const requestQuery = searchQuery.current,
      education = current.current.state.education ?? emptyEducation();
    const terms =
      requestQuery.trim() ||
      allTracks(education).find((t) => t.id === education.primary)
        ?.technologies ||
      "programming";
    setOnlineBusy(true);
    setOnlineMessage("Searching official course catalogues…");
    try {
      const data = await accountRequest(
        "/api/course-search?q=" + encodeURIComponent(terms),
      );
      if (searchQuery.current !== requestQuery) return;
      const found = liveCourseSchema.array().max(60).parse(data.courses),
        s = current.current.state,
        n = structuredClone(s.education ?? emptyEducation());
      const merged = new Map(
        [...n.assistant.live, ...found].map((c) => [c.id, c]),
      );
      n.assistant.live = [...merged.values()].slice(-60);
      await current.current.save({ ...s, education: n });
      setOnlineMessage(
        `${found.length} matching courses. ${data.status} ${data.coverage}`,
      );
    } catch (error) {
      setOnlineMessage(
        error instanceof Error
          ? error.message
          : "Online discovery is unavailable. Saved resources remain available.",
      );
    } finally {
      setOnlineBusy(false);
    }
  }
  useEffect(() => {
    if (query.trim().length < 3) return;
    const timer = setTimeout(() => void searchOnline(), 850);
    return () => clearTimeout(timer);
  }, [query]);
  const entries = recommendResources(props.state),
    entry = entries.find((r) => r.id === selected?.id),
    tracked = props.state.records.courses.find(
      (c) => c.catalogId === entry?.id,
    );
  async function track(status: string) {
    if (!entry) return;
    const now = new Date().toISOString(),
      today = dateKey(new Date(), props.state.profile.timezone),
      record = {
        ...(tracked ?? { id: crypto.randomUUID(), createdAt: now }),
        updatedAt: now,
        title: entry.title,
        provider: entry.provider,
        url: entry.url,
        catalogId: entry.id,
        skills: entry.topics,
        description: entry.description,
        status,
        totalLessons: tracked?.totalLessons ?? 0,
        completedLessons: tracked?.completedLessons ?? 0,
        estimatedHours: entry.estimatedHours,
        ...(status === "Completed"
          ? { completionDate: today, manualProgress: 100 }
          : {}),
      };
    try {
      await props.save({
        ...props.state,
        records: {
          ...props.state.records,
          courses: tracked
            ? props.state.records.courses.map((c) =>
                c.id === tracked.id ? record : c,
              )
            : [...props.state.records.courses, record],
        },
      });
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Unable to save course.",
      );
    }
  }
  return (
    <div className="learning-page">
      <section className="learning-hero">
        <div>
          <span className="eyebrow">
            <BookOpen size={15} /> Live catalogues and saved official resources
          </span>
          <h2>A useful next course.</h2>
          <p>
            Recommendations reflect your goal and evaluated gaps. Provider
            enrollment and external completion remain under your control.
          </p>
        </div>
      </section>
      <Feedback message={message} />
      <div className="learning-panel live-search">
        <div>
          <strong>Online course discovery</strong>
          <p>
            Searches live Harvard CS50 and Stanford SEE catalogues. Stanford
            materials are archived. Saved official resources cover additional
            providers.
          </p>
        </div>
        <button
          className="button"
          disabled={onlineBusy}
          onClick={() => void searchOnline()}
        >
          {onlineBusy ? "Searching online…" : "Refresh online courses"}
        </button>
        {onlineMessage && <p role="status">{onlineMessage}</p>}
      </div>
      <div className="learning-toolbar">
        <label className="learning-search">
          <Search size={16} />
          <input
            aria-label="Search course catalog"
            placeholder="Search title, provider or skill"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <select
          aria-label="Filter provider"
          value={provider}
          onChange={(event) => setProvider(event.target.value)}
        >
          {["All providers", ...new Set(entries.map((e) => e.provider))].map(
            (p) => (
              <option key={p}>{p}</option>
            ),
          )}
        </select>
      </div>
      <div className="resource-grid">
        {entries
          .filter(
            (r) =>
              (provider === "All providers" || r.provider === provider) &&
              `${r.title} ${r.provider} ${r.topics} ${r.description}`
                .toLowerCase()
                .includes(query.toLowerCase()),
          )
          .map((r) => (
            <button
              className="resource-card"
              key={r.id}
              onClick={() => setSelected(r)}
            >
              <div className="resource-heading">
                <span className="eyebrow">{r.provider}</span>
                <ArrowUpRight size={18} />
              </div>
              <h3>{r.title}</h3>
              <p>{r.description}</p>
              <Chips items={[r.type, r.difficulty, r.cost]} />
              <p className="resource-reason">{r.reason}</p>
              <small>
                {e.savedCatalog.includes(r.id) ? "Saved for later · " : ""}
                {props.state.records.courses.some((c) => c.catalogId === r.id)
                  ? "In My Learning"
                  : "View resource details"}
              </small>
            </button>
          ))}
      </div>
      {entry && (
        <Modal title={entry.title} wide onClose={() => setSelected(null)}>
          <div className="learning-modal-body">
            <span className="eyebrow">
              {entry.provider} · {entry.type}
            </span>
            <h3>About this resource</h3>
            <p>{entry.description}</p>
            <h3>What you will learn</h3>
            <Chips items={entry.topics.split(", ")} />
            <h3>Why it matters</h3>
            <p>{entry.reason}</p>
            <dl className="learning-details">
              <div>
                <dt>Prerequisites</dt>
                <dd>{entry.prerequisites}</dd>
              </div>
              <div>
                <dt>Provider-published duration</dt>
                <dd>{entry.duration}</dd>
              </div>
              <div>
                <dt>Your completion estimate</dt>
                <dd>{entry.personal}</dd>
              </div>
              <div>
                <dt>Language</dt>
                <dd>{entry.language}</dd>
              </div>
              <div>
                <dt>Certification and requirements</dt>
                <dd>{entry.certificate}</dd>
              </div>
              <div>
                <dt>Cost</dt>
                <dd>{entry.cost}</dd>
              </div>
              <div>
                <dt>Last checked</dt>
                <dd>
                  {entry.verified} · {entry.verification}
                </dd>
              </div>
            </dl>
            <h3>Course structure</h3>
            {entry.curriculum.length ? (
              <ol>
                {entry.curriculum.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ol>
            ) : (
              <p>
                Not specified. Select an individual course on the provider site
                for its verified curriculum.
              </p>
            )}
            <p>
              Career competencies: {entry.competencies.join(", ")} (ASCEND's
              mapping). Linked external certificates:{" "}
              {
                props.state.records.certificates.filter(
                  (c) => tracked && c.courseId === tracked.id,
                ).length
              }
              .
            </p>
            <div className="learning-actions">
              <button
                className="button primary"
                onClick={() => void track("Not Started")}
                disabled={!!tracked}
              >
                Add to My Learning
              </button>
              <button
                className="button"
                onClick={() => void track("In Progress")}
              >
                Start Course
              </button>
              <button
                className="button"
                disabled={busy}
                onClick={() =>
                  void commit((n) => ({
                    ...n,
                    savedCatalog: n.savedCatalog.includes(entry.id)
                      ? n.savedCatalog.filter((id) => id !== entry.id)
                      : [...n.savedCatalog, entry.id],
                  }))
                }
              >
                {e.savedCatalog.includes(entry.id)
                  ? "Unsave"
                  : "Save for Later"}
              </button>
              <a
                className="button"
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Official Course <ArrowUpRight size={15} />
              </a>
              <button
                className="button"
                onClick={() => {
                  if (
                    confirm(
                      "Record that you completed this external resource? This is your declaration; ASCEND does not verify provider completion.",
                    )
                  )
                    void track("Completed");
                }}
              >
                Mark as Completed
              </button>
              <button
                className="button"
                disabled={!tracked}
                onClick={() => {
                  setSelected(null);
                  props.add("certificates", {
                    courseId: tracked?.id,
                    title: entry.title,
                    organization: entry.provider,
                    skills: entry.topics,
                  });
                }}
              >
                Link Certificate
              </button>
            </div>
            <p className="muted">
              Adding or starting tracks your learning in ASCEND. Enroll
              separately with the provider. Difficulty labels and personal
              effort estimates are ASCEND guidance where the provider does not
              publish them.
            </p>
            <a href={entry.source} target="_blank" rel="noopener noreferrer">
              Official metadata source
            </a>
            <Feedback message={message} />
          </div>
        </Modal>
      )}
    </div>
  );
}

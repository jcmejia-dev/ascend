"use client";
import { useState } from "react";
import {
  Plus,
  Check,
  ArrowRight,
  BookOpen,
  Clock3,
  FolderGit2,
  Award,
} from "lucide-react";
import {
  addDays,
  dateKey,
  hours,
  goalProgress,
  type Kind,
  type State,
  type RecordItem,
} from "@/lib/model";
import { ActivityChart, Badge, Empty, Meter, SectionHead } from "./ui";
export type ViewActions = {
  state: State;
  add: (k: Kind, item?: Partial<RecordItem>) => void;
  edit: (k: Kind, r: RecordItem) => void;
  view: (k: Kind, r: RecordItem) => void;
  patch: (k: Kind, r: RecordItem) => Promise<void>;
  remove: (k: Kind, r: RecordItem) => void;
};
export function Roadmap({
  state,
  add,
  edit,
  view,
  patch,
  remove,
}: ViewActions) {
  const [selected, setSelected] = useState(state.records.paths[0]?.id || ""),
    [error, setError] = useState("");
  const path = state.records.paths.find((p) => p.id === selected);
  const milestones = state.records.milestones.filter(
      (m) => m.pathId === selected,
    ),
    done = milestones.filter((m) => m.status === "Completed").length;
  return (
    <>
      <div className="toolbar">
        <select
          aria-label="Learning path"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          {state.records.paths.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <button className="button" onClick={() => add("paths")}>
          <Plus size={16} />
          New path
        </button>
        <button
          className="button primary"
          disabled={!path}
          onClick={() => add("milestones", { pathId: selected })}
        >
          <Plus size={16} />
          Add milestone
        </button>
      </div>
      {path ? (
        <>
          <section className="panel roadmap-intro">
            <div>
              <div className="eyebrow">YOUR PERSONAL ROADMAP</div>
              <h2>{path.title}</h2>
              <p>
                {String(
                  path.description || "Build skills one milestone at a time.",
                )}
              </p>
              <small className="muted">
                A completed course is evidence of learning; mastery comes from
                applying it.
              </small>
            </div>
            <div className="path-progress">
              <strong>
                {done}
                <span> / {milestones.length}</span>
              </strong>
              <small>milestones completed</small>
              <Meter
                value={milestones.length ? (done / milestones.length) * 100 : 0}
                label="Path progress"
              />
            </div>
            <div className="path-actions">
              <button
                className="text-button"
                onClick={() => edit("paths", path)}
              >
                Edit path
              </button>
              <button
                className="text-button danger"
                onClick={() => remove("paths", path)}
              >
                Delete path
              </button>
            </div>
          </section>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="roadmap-list">
            {milestones.map((m, i) => (
              <article
                className={`milestone-card ${m.status === "Completed" ? "done" : ""}`}
                key={m.id}
              >
                <button
                  className="milestone-check"
                  aria-label={`${m.status === "Completed" ? "Reopen" : "Complete"} ${m.title}`}
                  onClick={async () => {
                    try {
                      await patch("milestones", {
                        ...m,
                        status:
                          m.status === "Completed"
                            ? "Not Started"
                            : "Completed",
                        completionDate:
                          m.status === "Completed"
                            ? ""
                            : dateKey(new Date(), state.profile.timezone),
                      });
                    } catch (e) {
                      setError(
                        e instanceof Error ? e.message : "Unable to save.",
                      );
                    }
                  }}
                >
                  {m.status === "Completed" ? (
                    <Check size={18} />
                  ) : (
                    <span>{String(i + 1).padStart(2, "0")}</span>
                  )}
                </button>
                <div className="milestone-main">
                  <button
                    className="record-title"
                    onClick={() => view("milestones", m)}
                  >
                    {m.title}
                  </button>
                  <div className="milestone-meta">
                    <Badge>{String(m.status)}</Badge>
                    {m.estimatedHours && (
                      <span>{String(m.estimatedHours)}h estimated</span>
                    )}
                    {m.targetDate && <span>Target {String(m.targetDate)}</span>}
                    {m.completionDate && (
                      <span>Completed {String(m.completionDate)}</span>
                    )}
                  </div>
                  <div className="tags">
                    {m.courseId && (
                      <span>
                        <BookOpen size={12} />
                        {state.records.courses.find((c) => c.id === m.courseId)
                          ?.title || "Removed course"}
                      </span>
                    )}
                    {m.projectId && (
                      <span>
                        <FolderGit2 size={12} />
                        {state.records.projects.find(
                          (p) => p.id === m.projectId,
                        )?.title || "Removed project"}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  className="icon-button"
                  aria-label={`Edit ${m.title}`}
                  onClick={() => edit("milestones", m)}
                >
                  <ArrowRight size={17} />
                </button>
                <button
                  className="text-button danger"
                  onClick={() => remove("milestones", m)}
                >
                  Delete
                </button>
              </article>
            ))}
          </div>
          {!milestones.length && (
            <Empty
              title="Chart your own path"
              description="Add the first milestone for this learning path."
              action={() => add("milestones", { pathId: selected })}
            />
          )}
        </>
      ) : (
        <Empty
          title="Make a learning path"
          description="Group the skills you want to practice into a roadmap."
          action={() => add("paths")}
        />
      )}
    </>
  );
}
const linked = (r: RecordItem, skill: string) =>
  `${r.skills || ""},${r.skill || ""},${r.language || ""},${r.technologies || ""}`
    .split(",")
    .some((s) => s.trim().toLowerCase() === skill.toLowerCase());
export function Skills({ state, add, edit, remove }: ViewActions) {
  return (
    <>
      <div className="toolbar">
        <p className="muted">
          Confidence is self-assessed. Activity is evidence, rather than a
          proficiency score.
        </p>
        <button className="button primary" onClick={() => add("skills")}>
          <Plus size={16} />
          Add skill
        </button>
      </div>
      <div className="skill-grid">
        {state.records.skills.map((s) => {
          const practice = state.records.practice.filter((r) =>
              linked(r, s.title),
            ),
            sessions = state.records.sessions.filter((r) => linked(r, s.title)),
            courses = state.records.courses.filter(
              (r) => linked(r, s.title) && r.status === "Completed",
            ),
            projects = state.records.projects.filter(
              (r) => linked(r, s.title) && r.status === "Completed",
            ),
            certs = state.records.certificates.filter((r) =>
              linked(r, s.title),
            ),
            last = [...practice, ...sessions]
              .map((r) => String(r.date))
              .sort()
              .reverse()[0];
          return (
            <article className="panel skill-card" key={s.id}>
              <div className="split">
                <h3>{s.title}</h3>
                <button
                  className="text-button"
                  onClick={() => edit("skills", s)}
                >
                  Edit
                </button>
              </div>
              <Badge>{String(s.confidence || "Exploring")}</Badge>
              <div className="skill-metrics">
                <span>
                  <BookOpen size={16} />
                  <strong>{courses.length}</strong>courses
                </span>
                <span>
                  <Clock3 size={16} />
                  <strong>{hours(practice).toFixed(1)}</strong>practice hrs
                </span>
                <span>
                  <FolderGit2 size={16} />
                  <strong>{projects.length}</strong>projects
                </span>
                <span>
                  <Award size={16} />
                  <strong>{certs.length}</strong>certificates
                </span>
              </div>
              <div className="split small">
                <span className="muted">
                  Last practiced: {last || "No activity yet"}
                </span>
                <button
                  className="text-button danger"
                  onClick={() => remove("skills", s)}
                >
                  Delete
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
export function Analytics({ state }: { state: State }) {
  const today = dateKey(new Date(), state.profile.timezone),
    [from, setFrom] = useState(addDays(today, -29)),
    [to, setTo] = useState(today);
  const within = (r: RecordItem, key = "date") =>
    String(r[key] || "") >= from && String(r[key] || "") <= to;
  const sessions = state.records.sessions.filter((s) => within(s)),
    practice = state.records.practice.filter((p) => within(p)),
    courses = state.records.courses.filter(
      (c) => c.status === "Completed" && within(c, "completionDate"),
    ),
    certs = state.records.certificates.filter((c) => within(c, "issueDate"));
  const days = Math.max(
      1,
      Math.round(
        (new Date(to + "T12:00:00Z").getTime() -
          new Date(from + "T12:00:00Z").getTime()) /
          86400000,
      ) + 1,
    ),
    bucket = days > 14 ? Math.ceil(days / 8) : 1;
  const data = Array.from(
    { length: Math.min(14, Math.ceil(days / bucket)) },
    (_, i) => {
      const day = addDays(from, i * bucket),
        end = addDays(day, bucket - 1);
      return {
        label: day.slice(5),
        value: hours(
          sessions.filter(
            (s) => String(s.date) >= day && String(s.date) <= end,
          ),
        ),
      };
    },
  );
  const independent = Array.from(
    { length: Math.min(8, Math.ceil(days / Math.max(1, Math.ceil(days / 8)))) },
    (_, i) => {
      const b = Math.max(1, Math.ceil(days / 8)),
        day = addDays(from, i * b),
        end = addDays(day, b - 1),
        set = practice.filter(
          (p) => String(p.date) >= day && String(p.date) <= end,
        );
      return {
        label: day.slice(5),
        value: hours(set.filter((p) => p.aiAssistance === "No AI assistance")),
        secondary: hours(
          set.filter((p) => p.aiAssistance !== "No AI assistance"),
        ),
      };
    },
  );
  const activity = new Set([...sessions, ...practice].map((r) => r.date)).size;
  const bySkill = Object.entries(
    sessions.reduce((out: Record<string, number>, r) => {
      const k = String(r.skill || "Unassigned");
      out[k] = (out[k] || 0) + Number(r.minutes) / 60;
      return out;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  return (
    <>
      <div className="toolbar">
        <label>
          From
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <span className="muted">Date range applies to every chart below.</span>
      </div>
      <div className="stats-grid">
        {[
          { label: "Study hours", value: hours(sessions).toFixed(1) },
          { label: "Courses completed", value: courses.length },
          { label: "Certificates recorded", value: certs.length },
          { label: "Days of learning", value: `${activity} / ${days}` },
        ].map((s) => (
          <article className="stat-card" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
          </article>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <SectionHead
            title="Study time"
            subtitle={
              bucket > 1
                ? `Hours grouped into ${bucket}-day intervals.`
                : "Daily study hours."
            }
          />
          <ActivityChart data={data} />
        </section>
        <section className="panel">
          <SectionHead
            title="Coding independence"
            subtitle="Both independent and assisted practice count as learning."
          />
          <ActivityChart
            data={independent}
            label="Independent and assisted practice"
          />
          <div className="chart-legend">
            <span>
              <i />
              No AI assistance
            </span>
            <span>
              <i className="assisted" />
              With AI assistance
            </span>
          </div>
        </section>
        <section className="panel">
          <SectionHead title="Study by skill" />
          {bySkill.length ? (
            bySkill.map(([skill, h]) => (
              <div className="distribution" key={skill}>
                <div className="split">
                  <strong>{skill}</strong>
                  <span>{h.toFixed(1)}h</span>
                </div>
                <Meter
                  value={(h / Math.max(1, hours(sessions))) * 100}
                  label={skill}
                />
              </div>
            ))
          ) : (
            <Empty
              title="See where your time goes"
              description="Associate study sessions with a skill to see the distribution."
            />
          )}
        </section>
        <section className="panel">
          <SectionHead title="Course completion history" />
          {courses.length ? (
            courses.map((c) => (
              <div className="timeline-row" key={c.id}>
                <BookOpen size={18} />
                <strong>{c.title}</strong>
                <span>{String(c.completionDate)}</span>
              </div>
            ))
          ) : (
            <Empty
              title="Completion history"
              description="Courses you explicitly complete within this range appear here."
            />
          )}
        </section>
        <section className="panel">
          <SectionHead title="Certificate timeline" />
          {certs.length ? (
            certs
              .sort((a, b) =>
                String(b.issueDate).localeCompare(String(a.issueDate)),
              )
              .map((c) => (
                <div className="timeline-row" key={c.id}>
                  <Award size={18} />
                  <strong>{c.title}</strong>
                  <span>{String(c.issueDate)}</span>
                </div>
              ))
          ) : (
            <Empty
              title="Your credentials over time"
              description="Recorded certificates within this range appear here."
            />
          )}
        </section>
        <section className="panel">
          <SectionHead title="Goal progress" />
          {state.records.goals
            .filter(
              (g) => String(g.startDate) <= to && String(g.dueDate) >= from,
            )
            .map((g) => (
              <div className="distribution" key={g.id}>
                <div className="split">
                  <strong>{g.title}</strong>
                  <span>
                    {goalProgress(g, state).toFixed(1)} /{" "}
                    {String(g.targetValue)}
                  </span>
                </div>
                <Meter
                  value={(goalProgress(g, state) / Number(g.targetValue)) * 100}
                  label={g.title}
                />
                <small className="muted">
                  {String(g.status)} · due {String(g.dueDate)}
                </small>
              </div>
            ))}
          {!state.records.goals.length && (
            <Empty
              title="Give progress a direction"
              description="Create a goal to follow your progress here."
            />
          )}
        </section>
      </div>
      <section className="panel lower-panel">
        <SectionHead title="Monthly study totals" />
        <div className="monthly-totals">
          {Object.entries(
            sessions.reduce((out: Record<string, number>, r) => {
              const m = String(r.date).slice(0, 7);
              out[m] = (out[m] || 0) + Number(r.minutes) / 60;
              return out;
            }, {}),
          )
            .sort()
            .map(([month, h]) => (
              <div key={month}>
                <span>{month}</span>
                <strong>{h.toFixed(1)} hours</strong>
              </div>
            ))}
          {!sessions.length && (
            <p className="muted">No study sessions in this date range.</p>
          )}
        </div>
      </section>
      <section className="panel lower-panel">
        <SectionHead
          title="Goal completion history"
          subtitle="Goals you explicitly marked completed in this date range."
        />
        <ActivityChart
          label="Goal completions"
          unit="goals"
          data={data.map((d, i) => ({
            label: d.label,
            value: state.records.goals.filter(
              (g) =>
                g.status === "Completed" &&
                within(g, "completionDate") &&
                String(g.completionDate) >= addDays(from, i * bucket) &&
                String(g.completionDate) <= addDays(from, (i + 1) * bucket - 1),
            ).length,
          }))}
        />
      </section>
    </>
  );
}
export const roles: Record<string, string[]> = {
  "Junior Frontend Developer": [
    "Semantic HTML and accessible forms",
    "Responsive CSS layouts",
    "JavaScript and DOM fundamentals",
    "React state and component design",
    "Testing and browser debugging",
    "Git and a deployed portfolio project",
  ],
  "Junior Full-Stack Developer": [
    "Frontend fundamentals and accessibility",
    "API design and validation",
    "Authentication and authorization",
    "SQL and database design",
    "Automated tests and CI",
    "A deployed full-stack project with documentation",
  ],
  "PHP / Laravel Developer": [
    "PHP fundamentals and Composer",
    "Laravel routing and controllers",
    "Eloquent and SQL queries",
    "Validation and authorization policies",
    "Feature tests",
    "Deployment and environment configuration",
  ],
  "Automation Developer": [
    "Workflow design and error handling",
    "API integration and authentication",
    "n8n or Power Automate workflows",
    "Data transformation",
    "Logging and observability",
    "Documented automation with evaluation",
  ],
  "AI Integration Developer": [
    "LLM fundamentals and limitations",
    "API integration and structured outputs",
    "MCP and tool calling",
    "Context and prompt design",
    "Evaluation and failure handling",
    "Secure, documented AI integration project",
  ],
};
export function Career({
  state,
  save,
  add,
  patch,
}: {
  state: State;
  save: (next: State) => Promise<void>;
  add: (k: Kind) => void;
  patch: (k: Kind, r: RecordItem) => Promise<void>;
}) {
  const [error, setError] = useState("");
  async function toggle(title: string) {
    try {
      const old = state.records.career.find(
          (r) =>
            r.type === "Competency" &&
            r.title === title &&
            r.role === state.profile.role,
        ),
        now = new Date().toISOString();
      await patch(
        "career",
        old
          ? {
              ...old,
              status: old.status === "Completed" ? "Planned" : "Completed",
              date: dateKey(new Date(), state.profile.timezone),
            }
          : {
              id: crypto.randomUUID(),
              title,
              type: "Competency",
              role: state.profile.role,
              status: "Completed",
              date: dateKey(new Date(), state.profile.timezone),
              createdAt: now,
              updatedAt: now,
            },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save.");
    }
  }
  return (
    <>
      <div className="toolbar">
        <label>
          Target role
          <select
            value={state.profile.role}
            onChange={(e) =>
              void save({
                ...state,
                profile: { ...state.profile, role: e.target.value },
              }).catch((e) => setError(e.message))
            }
          >
            {Object.keys(roles).map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <button className="button primary" onClick={() => add("career")}>
          <Plus size={16} />
          Log career activity
        </button>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="stats-grid">
        {[
          {
            label: "Completed courses",
            value: state.records.courses.filter((c) => c.status === "Completed")
              .length,
          },
          {
            label: "Certificates recorded",
            value: state.records.certificates.length,
          },
          {
            label: "Independent exercises",
            value: state.records.practice.filter(
              (p) =>
                p.status === "Completed" &&
                p.aiAssistance === "No AI assistance",
            ).length,
          },
          {
            label: "Completed projects",
            value: state.records.projects.filter(
              (p) => p.status === "Completed",
            ).length,
          },
        ].map((s) => (
          <article className="stat-card" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <strong className="stat-value">{s.value}</strong>
          </article>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <SectionHead
            title="What you can demonstrate"
            subtitle="A suggested checklist, based on your own assessment."
          />
          {(roles[state.profile.role] || []).map((t) => {
            const checked = state.records.career.some(
              (r) =>
                r.type === "Competency" &&
                r.role === state.profile.role &&
                r.title === t &&
                r.status === "Completed",
            );
            return (
              <label className="competency" key={t}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => void toggle(t)}
                />
                <span>{t}</span>
              </label>
            );
          })}
          <p className="muted small">
            Use projects, explanations, and code reviews as evidence. This
            checklist does not predict employability or guarantee a job.
          </p>
        </section>
        <section className="panel">
          <SectionHead title="Career preparation" />
          {["Interview practice", "Resume update", "Job application"].map(
            (type) => (
              <div className="career-summary" key={type}>
                <strong>{type}</strong>
                <span>
                  {
                    state.records.career.filter(
                      (r) => r.type === type && r.status === "Completed",
                    ).length
                  }{" "}
                  completed ·{" "}
                  {
                    state.records.career.filter(
                      (r) => r.type === type && r.status !== "Completed",
                    ).length
                  }{" "}
                  planned
                </span>
              </div>
            ),
          )}
          <p className="muted">
            Keep a record of preparation alongside your learning. Export your
            learning summary from Settings for resume planning.
          </p>
        </section>
      </div>
    </>
  );
}

"use client";
import {
  ArrowRight,
  BookOpen,
  Award,
  Clock3,
  Flame,
  Plus,
  Target,
  Code2,
  FolderGit2,
  CheckCircle2,
} from "lucide-react";
import {
  achievements,
  addDays,
  dateKey,
  goalProgress,
  hours,
  progress,
  studyStreak,
  weekStart,
  type State,
  type Kind,
  type RecordItem,
} from "@/lib/model";
import { ActivityChart, Badge, Empty, Meter, SectionHead } from "./ui";
export default function Dashboard({
  state,
  add,
  navigate,
  view,
}: {
  state: State;
  add: (k: Kind) => void;
  navigate: (v: string) => void;
  view: (k: Kind, r: RecordItem) => void;
}) {
  const today = dateKey(new Date(), state.profile.timezone),
    week = weekStart(today);
  const courses = state.records.courses.filter((c) => !c.archived),
    active = courses.filter((c) => c.status === "In Progress"),
    completed = courses.filter((c) => c.status === "Completed");
  const weekly = hours(
      state.records.sessions.filter(
        (s) => String(s.date) >= week && String(s.date) <= today,
      ),
    ),
    total = hours(state.records.sessions),
    earned = state.records.certificates.filter(
      (c) => !c.pendingVerification,
    ).length;
  const targets = [
    ...courses
      .filter((c) => c.targetDate && c.status !== "Completed")
      .map((c) => ({ ...c, date: c.targetDate, kind: "courses" as Kind })),
    ...state.records.goals
      .filter((g) => g.dueDate && g.status === "Active")
      .map((g) => ({ ...g, date: g.dueDate, kind: "goals" as Kind })),
    ...state.records.milestones
      .filter((m) => m.targetDate && m.status !== "Completed")
      .map((m) => ({ ...m, date: m.targetDate, kind: "milestones" as Kind })),
  ]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .slice(0, 3);
  const chart = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(week, i);
    return {
      label: new Date(day + "T12:00:00").toLocaleDateString("en", {
        weekday: "short",
      }),
      value: hours(state.records.sessions.filter((s) => s.date === day)),
    };
  });
  const month = today.slice(0, 7),
    monthly = hours(
      state.records.sessions.filter((s) => String(s.date).startsWith(month)),
    ),
    recent = [
      ...state.records.courses
        .filter((c) => c.lastLessonAt)
        .map((c) => ({
          ...c,
          eventDate: String(c.lastLessonAt).slice(0, 10),
          text: `Lesson ${c.completedLessons} completed`,
          kind: "courses" as Kind,
        })),
      ...state.records.courses
        .filter((c) => c.status === "Completed")
        .map((c) => ({
          ...c,
          eventDate: c.completionDate,
          text: "Course completed",
          kind: "courses" as Kind,
        })),
      ...state.records.certificates.map((c) => ({
        ...c,
        eventDate: c.issueDate,
        text: "Certificate recorded",
        kind: "certificates" as Kind,
      })),
      ...state.records.milestones
        .filter((m) => m.status === "Completed")
        .map((m) => ({
          ...m,
          eventDate: m.completionDate,
          text: "Milestone completed",
          kind: "milestones" as Kind,
        })),
    ]
      .sort((a, b) => String(b.eventDate).localeCompare(String(a.eventDate)))
      .slice(0, 3);
  const completedLessons = courses.reduce(
    (n, c) => n + Number(c.completedLessons || 0),
    0,
  );
  return (
    <>
      <div className="stats-grid">
        {[
          {
            label: "Active courses",
            value: active.length,
            caption: `${completed.length} completed`,
            icon: BookOpen,
          },
          {
            label: "Certificates earned",
            value: earned,
            caption: "Your accomplishments, collected",
            icon: Award,
          },
          {
            label: "Total study hours",
            value: total.toFixed(1),
            caption: `${monthly.toFixed(1)} hours this month`,
            icon: Clock3,
          },
          {
            label: "Learning streak",
            value: `${studyStreak(state)} days`,
            caption: "Study and practice activity",
            icon: Flame,
          },
        ].map((s) => (
          <article className="stat-card" key={s.label}>
            <div className="stat-label">
              {s.label}
              <s.icon size={17} />
            </div>
            <div className="stat-value">{s.value}</div>
            <p>{s.caption}</p>
          </article>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="hero-panel panel">
          <div className="hero-copy">
            <div className="eyebrow">YOUR LEARNING JOURNEY</div>
            <h2>
              Small steps.
              <br />
              Lasting progress.
            </h2>
            <p>
              Keep learning, build something real, and let your work speak for
              itself.
            </p>
            <button
              className="button primary"
              onClick={() => navigate(active.length ? "Courses" : "Roadmap")}
            >
              {active.length ? "Continue learning" : "Explore your roadmap"}
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="progress-orbit">
            <svg
              viewBox="0 0 180 180"
              role="img"
              aria-label={`${completed.length} of ${courses.length} courses completed`}
            >
              <circle cx="90" cy="90" r="72" className="orbit-track" />
              <circle
                cx="90"
                cy="90"
                r="72"
                className="orbit-progress"
                strokeDasharray={`${courses.length ? (completed.length / courses.length) * 452 : 0} 452`}
              />
            </svg>
            <div>
              <strong>
                {completed.length}
                <span>/{courses.length}</span>
              </strong>
              <small>courses completed</small>
            </div>
          </div>
          <div className="hero-foot">
            <span>
              <CheckCircle2 size={15} />
              {completedLessons} lessons completed
            </span>
            <span>Every step counts.</span>
          </div>
        </section>
        <section className="panel weekly-goal">
          <SectionHead
            title="This week"
            subtitle="A little consistency goes a long way."
          >
            <Target size={18} />
          </SectionHead>
          <div className="goal-number">
            {weekly.toFixed(1)}
            <span> / {state.profile.weeklyHours} hrs</span>
          </div>
          <Meter
            value={(weekly / state.profile.weeklyHours) * 100}
            label="Weekly study goal"
          />
          <div className="split muted">
            <span>Study goal</span>
            <span>
              {Math.round((weekly / state.profile.weeklyHours) * 100)}%
            </span>
          </div>
          <div className="week-dots">
            {chart.map((d) => (
              <div key={d.label}>
                <span className={d.value > 0 ? "active" : ""}>
                  {d.value > 0 ? (
                    <CheckCircle2 size={17} />
                  ) : (
                    <span className="dot" />
                  )}
                </span>
                <small>{d.label.slice(0, 1)}</small>
              </div>
            ))}
          </div>
          <button className="text-button" onClick={() => navigate("Settings")}>
            Adjust weekly goal
            <ArrowRight size={14} />
          </button>
        </section>
        <section className="panel">
          <SectionHead title="Continue learning">
            <button className="text-button" onClick={() => navigate("Courses")}>
              All courses
              <ArrowRight size={14} />
            </button>
          </SectionHead>
          {active.length ? (
            active.slice(0, 3).map((c) => (
              <button
                className="course-row"
                key={c.id}
                onClick={() => view("courses", c)}
              >
                <div className="course-glyph">
                  <BookOpen size={20} />
                </div>
                <div className="row-content">
                  <strong>{c.title}</strong>
                  <small>{String(c.provider || "Self-directed")}</small>
                  <Meter value={progress(c)} label={`${c.title} progress`} />
                </div>
                <span className="muted">{progress(c)}%</span>
              </button>
            ))
          ) : (
            <Empty
              title="Your next chapter starts here"
              description="Add a course you’re taking and make your first step visible."
              action={() => add("courses")}
              label="Add your first course"
            />
          )}
        </section>
        <section className="panel">
          <SectionHead title="Upcoming milestones" />
          <div className="milestone-list">
            {targets.length ? (
              targets.map((t) => (
                <button
                  className="milestone-row"
                  key={t.id}
                  onClick={() => view(t.kind, t)}
                >
                  <div className="date-tile">
                    <strong>{String(t.date).slice(8)}</strong>
                    <small>
                      {new Date(
                        String(t.date) + "T12:00:00",
                      ).toLocaleDateString("en", { month: "short" })}
                    </small>
                  </div>
                  <div>
                    <strong>{t.title}</strong>
                    <small>
                      {String(t.date) < today
                        ? "Overdue · adjust when needed"
                        : String(t.date) === today
                          ? "Due today"
                          : new Date(
                              String(t.date) + "T12:00:00",
                            ).toLocaleDateString("en", {
                              month: "long",
                              day: "numeric",
                            })}
                    </small>
                  </div>
                  <ArrowRight size={15} />
                </button>
              ))
            ) : (
              <Empty
                title="Room to plan"
                description="Set a course target date or a learning goal to see what’s next."
                action={() => add("goals")}
                label="Set a goal"
              />
            )}
          </div>
        </section>
        <section className="panel">
          <SectionHead
            title="Study activity"
            subtitle="Your focus, over the last week."
          >
            <Badge>This week</Badge>
          </SectionHead>
          <ActivityChart data={chart} />
        </section>
        <section className="panel">
          <SectionHead title="Recent accomplishments" />
          {recent.length ? (
            recent.map((r) => (
              <button
                className="achievement-row"
                key={`${r.id}-${r.text}`}
                onClick={() => view(r.kind, r)}
              >
                <span className="achievement-icon">
                  <Award size={20} />
                </span>
                <div>
                  <strong>{r.title}</strong>
                  <small>
                    {r.text} · {String(r.eventDate || "")}
                  </small>
                </div>
              </button>
            ))
          ) : (
            <Empty
              title="A space for your wins"
              description="Completed courses, certificates, and milestones will appear here."
            />
          )}
          {achievements(state).length > 0 && (
            <div className="achievement-tags">
              {achievements(state).map((a) => (
                <Badge key={a}>{a}</Badge>
              ))}
            </div>
          )}
        </section>
      </div>
      <SectionHead
        title="Make your next move"
        subtitle="Progress begins with something small."
      />
      <div className="quick-actions">
        {[
          { kind: "courses" as Kind, label: "Add course", icon: BookOpen },
          {
            kind: "sessions" as Kind,
            label: "Log study session",
            icon: Clock3,
          },
          {
            kind: "certificates" as Kind,
            label: "Add certificate",
            icon: Award,
          },
          {
            kind: "practice" as Kind,
            label: "Log coding practice",
            icon: Code2,
          },
          { kind: "projects" as Kind, label: "Add project", icon: FolderGit2 },
        ].map((a) => (
          <button key={a.kind} onClick={() => add(a.kind)}>
            <a.icon size={18} />
            <span>{a.label}</span>
            <Plus size={14} />
          </button>
        ))}
      </div>
      {state.records.projects.some((p) =>
        ["In Development", "Testing"].includes(String(p.status)),
      ) && (
        <section className="panel lower-panel">
          <SectionHead title="Projects in progress">
            <button
              className="text-button"
              onClick={() => navigate("Projects")}
            >
              All projects
              <ArrowRight size={14} />
            </button>
          </SectionHead>
          {state.records.projects
            .filter((p) =>
              ["In Development", "Testing"].includes(String(p.status)),
            )
            .slice(0, 3)
            .map((p) => (
              <button
                className="achievement-row"
                key={p.id}
                onClick={() => view("projects", p)}
              >
                <FolderGit2 size={18} />
                <div>
                  <strong>{p.title}</strong>
                  <small>
                    {String(p.technologies || "")} · {String(p.status)}
                  </small>
                </div>
              </button>
            ))}
        </section>
      )}
      {state.records.goals.filter((g) => g.status === "Active").length > 0 && (
        <section className="panel lower-panel">
          <SectionHead title="Goals in motion" />
          {state.records.goals
            .filter((g) => g.status === "Active")
            .slice(0, 3)
            .map((g) => (
              <div className="goal-inline" key={g.id}>
                <strong>{g.title}</strong>
                <Meter
                  value={(goalProgress(g, state) / Number(g.targetValue)) * 100}
                  label={g.title}
                />
                <span>
                  {goalProgress(g, state).toFixed(1)} / {String(g.targetValue)}
                </span>
              </div>
            ))}
        </section>
      )}
    </>
  );
}

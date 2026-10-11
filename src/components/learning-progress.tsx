"use client";
import { useState } from "react";
import {
  Award,
  LockKeyhole,
  CheckCheck,
  ArrowRight,
  Target,
  FolderGit2,
} from "lucide-react";
import {
  allTracks,
  achievements,
  level,
  streak,
  readiness,
  mastery,
  recordAttempt,
  dailyPlan,
} from "@/lib/education";
import {
  lessons,
  questions,
  capstones,
  interviews,
} from "@/lib/academy-content";
import { dateKey } from "@/lib/model";
import { Modal, Meter } from "./ui";
import ProjectCoreChecker from "./project-core-checker";
import { useEducation, Feedback, type LearningProps } from "./education-shared";
export function DailyPlan(props: LearningProps) {
  const { e, commit, message, busy } = useEducation(props),
    today = dateKey(new Date(), props.state.profile.timezone),
    plan = dailyPlan(props.state, today),
    [minutes, setMinutes] = useState(plan.minutes),
    [editing, setEditing] = useState(false);
  return (
    <section className="learning-panel daily-plan">
      <div className="section-head">
        <div>
          <span className="eyebrow">Your learning plan for today</span>
          <h3>
            {e.primary
              ? allTracks(e).find((p) => p.id === e.primary)?.title
              : "Start with a direction"}
          </h3>
        </div>
        <span>{plan.minutes} min · flexible</span>
      </div>
      {!e.primary && (
        <button
          className="button primary"
          onClick={() => props.navigate("Career Paths")}
        >
          What do you want to become? <ArrowRight size={15} />
        </button>
      )}
      <p>
        Suggested from your study hours, prerequisite gaps, due reviews, active
        courses and deadlines. Take breaks and adjust the plan to your day.
      </p>
      <div className="plan-tasks">
        {plan.tasks.map((task) => (
          <div key={task.id}>
            <input
              aria-label={`Mark plan task done: ${task.title}`}
              type="checkbox"
              disabled={busy || (e.assistant.enabled && !editing)}
              checked={task.done}
              onChange={(event) =>
                void commit((n) => ({
                  ...n,
                  plans: {
                    ...n.plans,
                    [today]: {
                      ...plan,
                      tasks: plan.tasks.map((t) =>
                        t.id === task.id
                          ? { ...t, done: event.target.checked }
                          : t,
                      ),
                    },
                  },
                }))
              }
            />
            <button onClick={() => props.navigate(task.destination)}>
              {task.title}
            </button>
            <span>{task.minutes} min</span>
            {(!e.assistant.enabled || editing) && (
              <button
                className="icon-button"
                aria-label={`Remove ${task.title} from today's plan`}
                onClick={() =>
                  void commit((n) => ({
                    ...n,
                    plans: {
                      ...n.plans,
                      [today]: {
                        ...plan,
                        tasks: plan.tasks.filter((t) => t.id !== task.id),
                      },
                    },
                  }))
                }
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      {e.assistant.enabled && (
        <div className="learning-actions">
          <span className="muted">
            Academy tasks are recorded automatically from your successful
            attempts.
          </span>
          <button className="button" onClick={() => setEditing(!editing)}>
            {editing ? "Finish editing plan" : "Edit today's plan"}
          </button>
        </div>
      )}
      {(!e.assistant.enabled || editing) && (
        <div className="learning-actions">
          <label>
            Today's time budget
            <input
              type="number"
              min={5}
              max={240}
              value={minutes}
              onChange={(event) => setMinutes(Number(event.target.value))}
            />
          </label>
          <button
            className="button"
            disabled={busy || minutes < 5 || minutes > 240}
            onClick={() =>
              void commit((n) => {
                const fresh = {
                  ...props.state,
                  education: { ...n, plans: {} },
                };
                return {
                  ...n,
                  plans: {
                    ...n.plans,
                    [today]: dailyPlan(fresh, today, minutes),
                  },
                };
              })
            }
          >
            Adjust / regenerate
          </button>
        </div>
      )}
      <p className="muted">
        Plan checkmarks organize your day; evaluated activities provide mastery
        and XP. Missing a day does not remove progress.
      </p>
      <Feedback message={message} />
    </section>
  );
}
export function Achievements(props: LearningProps) {
  const { e, commit, message, busy } = useEducation(props),
    l = level(e),
    s = streak(e, dateKey(new Date(), props.state.profile.timezone)),
    badges = achievements(props.state);
  return (
    <div className="learning-page">
      <section className="learning-hero">
        <div>
          <span className="eyebrow">
            <Award size={15} /> Participation and accomplishment
          </span>
          <h2>Level {l.level}. Built one step at a time.</h2>
          <p>
            XP recognizes meaningful activity. Competence comes from evaluated
            evidence; these badges are internal achievements.
          </p>
          <Meter label="Level progress" value={l.progress} />
          <p>
            {l.xp} XP · {l.next - l.xp} to level {l.level + 1}
          </p>
        </div>
        <div className="level-orbit">
          <strong>{l.level}</strong>
          <span>ASCEND level</span>
        </div>
      </section>
      <div className="learning-stats">
        <div>
          <strong>{e.awards.length}</strong>
          <span>Earned badges</span>
        </div>
        <div>
          <strong>{s.current}</strong>
          <span>Current activity streak</span>
        </div>
        <div>
          <strong>{s.longest}</strong>
          <span>Longest streak</span>
        </div>
        <div>
          <strong>{e.xp.length}</strong>
          <span>Unique XP awards</span>
        </div>
      </div>
      <div className="achievement-grid">
        {badges.map((badge, index) => {
          const earned = e.awards.find((a) => a.id === badge.id);
          return (
            <article
              key={badge.id}
              className={`achievement-card ${earned ? "earned" : ""}`}
            >
              <div
                className="badge-art"
                style={{ transform: `rotate(${index % 2 ? 4 : -4}deg)` }}
              >
                {earned ? (
                  <Award size={34} strokeWidth={1.4} />
                ) : (
                  <LockKeyhole size={27} strokeWidth={1.4} />
                )}
              </div>
              <h3>{badge.title}</h3>
              <p>{badge.description}</p>
              <Meter
                label={`${badge.title} progress`}
                value={(badge.value / badge.target) * 100}
              />
              <small>
                {Math.min(badge.value, badge.target)} / {badge.target} ·{" "}
                {earned ? `Earned ${earned.at.slice(0, 10)}` : "Not yet earned"}
              </small>
            </article>
          );
        })}
      </div>
      <section className="learning-panel">
        <h3>Recent rewards</h3>
        <div className="learning-history">
          {e.xp
            .slice(-20)
            .reverse()
            .map((x) => (
              <div key={x.key}>
                <span>
                  {x.label} · {x.at.slice(0, 10)}
                </span>
                <strong>+{x.amount} XP</strong>
              </div>
            ))}
          {!e.xp.length && (
            <p>Complete an evaluated lesson, quiz or challenge to begin.</p>
          )}
        </div>
        <details>
          <summary>Configure XP defaults</summary>
          <p>
            Changes affect future awards only. Repeated submissions never change
            an existing award.
          </p>
          <div className="learning-form-grid">
            {(Object.keys(e.weights) as (keyof typeof e.weights)[]).map(
              (key) => (
                <label key={key}>
                  {key} XP
                  <input
                    type="number"
                    min={0}
                    max={500}
                    defaultValue={e.weights[key]}
                    disabled={busy}
                    onBlur={(event) => {
                      const amount = Number(event.target.value);
                      if (
                        Number.isInteger(amount) &&
                        amount >= 0 &&
                        amount <= 500 &&
                        amount !== e.weights[key]
                      )
                        void commit((n) => ({
                          ...n,
                          weights: { ...n.weights, [key]: amount },
                        }));
                    }}
                  />
                </label>
              ),
            )}
          </div>
        </details>
        <Feedback message={message} />
      </section>
    </div>
  );
}
export function LearningProgress(props: LearningProps) {
  const { e, commit, message, busy } = useEducation(props),
    r = readiness(e),
    path = allTracks(e).find((p) => p.id === e.primary),
    [selectedProject, setSelectedProject] = useState(""),
    [repo, setRepo] = useState(""),
    [notes, setNotes] = useState(""),
    [checked, setChecked] = useState<string[]>([]),
    [assistance, setAssistance] = useState<
      "None" | "Hints / review" | "Generated implementation"
    >("Hints / review"),
    [interview, setInterview] = useState(""),
    [response, setResponse] = useState(""),
    [reflection, setReflection] = useState<string[]>([]),
    [git, setGit] = useState(false),
    [gitAnswers, setGitAnswers] = useState<Record<string, number>>({});
  const project = capstones.find((p) => p.id === selectedProject),
    prompt = interviews.find((i) => i.id === interview),
    gitQuestions = questions.filter((q) => q.topic === "Git");
  async function submitProject() {
    if (!project || !/^https:\/\//.test(repo)) {
      return;
    }
    const ok = await commit((n) => ({
      ...n,
      submissions: [
        ...n.submissions,
        {
          id: crypto.randomUUID(),
          project: project.id,
          url: repo,
          notes,
          criteria: project.criteria.filter((c) => checked.includes(c)),
          tests: project.tests.filter((c) => checked.includes(c)),
          documentation: project.docs.filter((c) => checked.includes(c)),
          assistance,
          at: new Date().toISOString(),
        },
      ],
    }));
    if (ok) {
      setSelectedProject("");
      props.add("projects", {
        title: project.title,
        repositoryUrl: repo,
        description: project.description,
        status: "In Development",
        notes: `Submitted academy evidence (self-reported). ${notes}`,
      });
    }
  }
  return (
    <div className="learning-page">
      <section className="learning-hero">
        <div>
          <span className="eyebrow">
            <Target size={15} /> Evidence, with provenance
          </span>
          <h2>{r.title}</h2>
          <p>
            {r.next}. Internal readiness supports learning decisions and does
            not declare professional qualification.
          </p>
          <button
            className="button"
            onClick={() => props.navigate("Career Paths")}
          >
            Challenge the recommendation / retake diagnostic
          </button>
        </div>
      </section>
      <Feedback message={message} />
      <section className="learning-panel">
        <h3>Readiness checkpoints</h3>
        <div className="readiness-list">
          {r.criteria.map((criterion, i) => (
            <div key={criterion} className={i <= r.stage ? "met" : ""}>
              <CheckCheck size={18} />
              <span>{criterion}</span>
              <small>
                {i <= r.stage ? "Reached" : "Evidence still needed"}
              </small>
            </div>
          ))}
        </div>
        <p>
          Demonstrated topics: {r.mastered}; completed lessons: {r.completed};
          distinct challenges: {r.challenge}; passed assessment:{" "}
          {r.assessment ? "Yes" : "No"}; passed scheduled review:{" "}
          {r.reviews ? "Yes" : "No"}; complete project declaration:{" "}
          {r.project ? "Yes" : "No"}.
        </p>
      </section>
      <section className="learning-panel">
        <div className="section-head">
          <h3>{path?.title ?? "Choose a career path"} · competency evidence</h3>
          <button className="button" onClick={() => setGit(true)}>
            Git fundamentals assessment
          </button>
        </div>
        <div className="competency-table">
          {(path?.topics ?? lessons.slice(0, 9).map((l) => l.id)).map(
            (topic) => {
              const m = mastery(e, topic);
              return (
                <div key={topic}>
                  <strong>{topic}</strong>
                  <span>
                    Self-report: {e.selfReported[topic] ?? "Not reported"}
                  </span>
                  <span>
                    {m.status} · {m.unique} distinct evidence sources · recent{" "}
                    {m.accuracy}%
                  </span>
                </div>
              );
            },
          )}
        </div>
        <p>
          Certificates in vault: {props.state.records.certificates.length}.
          External credentials and course completion provide context, but do not
          automatically mark a competency mastered.
        </p>
        <button
          className="button"
          onClick={() => props.navigate("Certificates")}
        >
          View certificate evidence
        </button>
      </section>
      <section className="learning-panel">
        <h3>Build something you can explain</h3>
        <p>
          Repository submissions and checklist declarations are self-reported.
          ASCEND does not fetch or inspect these repositories.
        </p>
        <div className="resource-grid">
          {capstones.map((p) => (
            <button
              className="resource-card"
              key={p.id}
              onClick={() => {
                setSelectedProject(p.id);
                setRepo("");
                setNotes("");
                setChecked([]);
              }}
            >
              <span className="eyebrow">
                <FolderGit2 size={15} />
                {p.tier}
              </span>
              <h4>{p.title}</h4>
              <p>{p.description}</p>
              <small>
                {p.criteria.length} acceptance criteria · tests + documentation
              </small>
            </button>
          ))}
        </div>
      </section>
      <section className="learning-panel">
        <h3>Portfolio submissions</h3>
        {!e.submissions.length && <p>No submitted project evidence yet.</p>}
        <div className="learning-history">
          {e.submissions.map((s) => (
            <div key={s.id}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {capstones.find((p) => p.id === s.project)?.title}
              </a>
              <span>
                {s.at.slice(0, 10)} · {s.assistance} assistance · self-reported
              </span>
            </div>
          ))}
        </div>
      </section>
      <section className="learning-panel">
        <h3>Interview practice</h3>
        <p>
          Practice explaining decisions. Reflections are recorded without an
          automated hiring score.
        </p>
        {interviews.map((i) => (
          <button
            key={i.id}
            className="interview-card"
            onClick={() => {
              setInterview(i.id);
              setResponse("");
              setReflection([]);
            }}
          >
            {i.prompt}
            <ArrowRight size={16} />
          </button>
        ))}
        <p>
          {e.attempts.filter((a) => a.kind === "interview").length} recorded
          reflections.
        </p>
      </section>
      <section className="learning-panel">
        <h3>Learning and review history</h3>
        <div className="learning-history">
          {e.attempts
            .slice(-30)
            .reverse()
            .map((a) => (
              <div key={a.id}>
                <span>
                  {a.day} · {a.kind}: {a.unit}
                </span>
                <span>
                  {a.passed ? "Passed" : "Review needed"} · {a.score}% ·{" "}
                  {a.source}
                </span>
              </div>
            ))}
        </div>
      </section>
      {project && (
        <Modal
          title={project.title}
          wide
          onClose={() => setSelectedProject("")}
        >
          <form
            className="learning-modal-body"
            onSubmit={(event) => {
              event.preventDefault();
              void submitProject();
            }}
          >
            <span className="eyebrow">{project.tier}</span>
            <p>{project.description}</p>
            <h4>Suggested architecture</h4>
            <p>{project.architecture}</p>
            <h4>Technical constraints</h4>
            <p>{project.constraints}</p>
            {project.id === "calculator" && <ProjectCoreChecker {...props} />}
            {[
              ["Acceptance criteria", project.criteria],
              ["Testing checklist", project.tests],
              ["Documentation", project.docs],
            ].map(([title, items]) => (
              <fieldset className="project-checklist" key={String(title)}>
                <legend>{String(title)} (your declaration)</legend>
                {(items as string[]).map((item) => (
                  <label className="answer-option" key={item}>
                    <input
                      type="checkbox"
                      checked={checked.includes(item)}
                      onChange={(event) =>
                        setChecked(
                          event.target.checked
                            ? [...checked, item]
                            : checked.filter((c) => c !== item),
                        )
                      }
                    />
                    {item}
                  </label>
                ))}
              </fieldset>
            ))}
            <label>
              Repository / work evidence URL
              <input
                type="url"
                required
                pattern="https://.*"
                value={repo}
                onChange={(event) => setRepo(event.target.value)}
                placeholder="https://github.com/you/project"
              />
            </label>
            <label>
              Assistance disclosure
              <select
                value={assistance}
                onChange={(event) =>
                  setAssistance(event.target.value as typeof assistance)
                }
              >
                <option>None</option>
                <option>Hints / review</option>
                <option>Generated implementation</option>
              </select>
            </label>
            <label>
              Evidence notes (tests run, documentation, known limitations)
              <textarea
                value={notes}
                maxLength={10000}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>
            <p>
              Only the HTTPS URL, project reference and checklist completeness
              are checked automatically. Repository content and reported tests
              are not independently verified.
            </p>
            <button className="button primary" disabled={busy}>
              Submit project evidence
            </button>
            <Feedback message={message} />
          </form>
        </Modal>
      )}
      {prompt && (
        <Modal
          title="Mock interview reflection"
          wide
          onClose={() => setInterview("")}
        >
          <form
            className="learning-modal-body"
            onSubmit={(event) => {
              event.preventDefault();
              void commit((n, s) =>
                recordAttempt(
                  n,
                  {
                    unit: prompt.id,
                    kind: "interview",
                    topic: "Interview reflection",
                    passed: false,
                    score: 0,
                    source: "self-reflection",
                    answer: response,
                  },
                  s.profile.timezone,
                ),
              ).then((ok) => {
                if (ok) setInterview("");
              });
            }}
          >
            <p>{prompt.prompt}</p>
            <label>
              Your explanation
              <textarea
                required
                minLength={50}
                maxLength={10000}
                value={response}
                onChange={(event) => setResponse(event.target.value)}
              />
            </label>
            <h4>Self-review rubric</h4>
            {prompt.rubric.map((item) => (
              <label className="answer-option" key={item}>
                <input
                  type="checkbox"
                  checked={reflection.includes(item)}
                  onChange={(event) =>
                    setReflection(
                      event.target.checked
                        ? [...reflection, item]
                        : reflection.filter((v) => v !== item),
                    )
                  }
                />
                {item}
              </label>
            ))}
            <p>
              This is interview practice and self-reflection; no hiring or
              mastery score is awarded.
            </p>
            <button className="button primary" disabled={busy}>
              Save reflection
            </button>
            <Feedback message={message} />
          </form>
        </Modal>
      )}
      {git && (
        <Modal
          title="Git fundamentals assessment"
          onClose={() => setGit(false)}
        >
          <div className="learning-modal-body">
            {gitQuestions.map((q) => (
              <fieldset className="quiz-question" key={q.id}>
                <legend>{q.prompt}</legend>
                {q.options.map((option, i) => (
                  <label className="answer-option" key={option}>
                    <input
                      name={q.id}
                      type="radio"
                      checked={gitAnswers[q.id] === i}
                      onChange={() =>
                        setGitAnswers({ ...gitAnswers, [q.id]: i })
                      }
                    />
                    {option}
                  </label>
                ))}
              </fieldset>
            ))}
            <button
              className="button primary"
              disabled={
                busy || gitQuestions.some((q) => gitAnswers[q.id] === undefined)
              }
              onClick={() =>
                void commit((n, s) => {
                  for (const q of gitQuestions)
                    n = recordAttempt(
                      n,
                      {
                        unit: q.id,
                        kind: "question",
                        topic: "Git",
                        passed: gitAnswers[q.id] === q.answer,
                        score: gitAnswers[q.id] === q.answer ? 100 : 0,
                        source: "git-assessment",
                        answer: q.options[gitAnswers[q.id]],
                      },
                      s.profile.timezone,
                    );
                  return recordAttempt(
                    n,
                    {
                      unit: "git-assessment",
                      kind: "assessment",
                      topic: "Git",
                      passed: gitQuestions.every(
                        (q) => gitAnswers[q.id] === q.answer,
                      ),
                      score:
                        (gitQuestions.filter(
                          (q) => gitAnswers[q.id] === q.answer,
                        ).length /
                          gitQuestions.length) *
                        100,
                      source: "git-assessment",
                    },
                    s.profile.timezone,
                  );
                }).then((ok) => {
                  if (ok) setGit(false);
                })
              }
            >
              Submit assessment
            </button>
            <Feedback message={message} />
          </div>
        </Modal>
      )}
    </div>
  );
}

"use client";
import { useState } from "react";
import { ArrowRight, Check, Map, Compass } from "lucide-react";
import {
  allTracks,
  mastery,
  roadmap,
  recordAttempt,
  type CareerTrack,
} from "@/lib/education";
import { questions } from "@/lib/academy-content";
import { Modal, Meter } from "./ui";
import {
  useEducation,
  Feedback,
  Chips,
  type LearningProps,
} from "./education-shared";
export default function CareerPaths(props: LearningProps) {
  const { e, commit, message, setMessage, busy } = useEducation(props),
    [selected, setSelected] = useState(""),
    [editing, setEditing] = useState<CareerTrack | null>(null),
    [diagnostic, setDiagnostic] = useState(false),
    [answers, setAnswers] = useState<Record<string, number>>({}),
    [graded, setGraded] = useState(false);
  const paths = allTracks(e),
    chosen = paths.find((p) => p.id === (selected || e.primary)) ?? paths[0],
    nodes = roadmap(e);
  const diagnosticQuestions = questions.filter((q) =>
    [
      "js-binding",
      "js-loop",
      "js-promise",
      "js-async",
      "php-strict",
      "laravel-auth",
      "sql-null",
      "react-state",
      "git-revert",
      "gha-secret",
      "api-idempotency",
      "security-xss",
      "llm-evaluation",
      "mcp-scope",
      "automation-retry",
    ].includes(q.id),
  );
  async function grade() {
    if (diagnosticQuestions.some((q) => answers[q.id] === undefined)) {
      setMessage(
        "Answer each question before submitting. You can explore all lessons without taking this diagnostic.",
      );
      return;
    }
    await commit((next, s) => {
      for (const q of diagnosticQuestions)
        next = recordAttempt(
          next,
          {
            unit: q.id,
            kind: "question",
            topic: q.topic,
            passed: answers[q.id] === q.answer,
            score: answers[q.id] === q.answer ? 100 : 0,
            source: "diagnostic",
            answer: q.options[answers[q.id]],
          },
          s.profile.timezone,
        );
      const score = Math.round(
        (diagnosticQuestions.filter((q) => answers[q.id] === q.answer).length /
          diagnosticQuestions.length) *
          100,
      );
      return recordAttempt(
        next,
        {
          unit: "diagnostic",
          kind: "assessment",
          topic: "Diagnostic",
          passed: score >= 80,
          score,
          source: "diagnostic",
        },
        s.profile.timezone,
      );
    });
    setGraded(true);
  }
  return (
    <div className="learning-page">
      <section className="learning-hero">
        <div>
          <span className="eyebrow">
            <Compass size={15} /> A direction, not a deadline
          </span>
          <h2>
            {e.primary
              ? `Your path: ${paths.find((p) => p.id === e.primary)?.title}`
              : "What do you want to become?"}
          </h2>
          <p>
            Choose a direction, demonstrate what you know, and build a plan
            around the gaps. Every lesson remains open to exploration.
          </p>
        </div>
        <button
          className="button primary"
          onClick={() => {
            setDiagnostic(true);
            setGraded(false);
            setAnswers({});
          }}
        >
          Take / retake diagnostic <ArrowRight size={16} />
        </button>
      </section>
      <Feedback message={message} />
      <div className="learning-two">
        <section className="learning-panel">
          <h3>Career tracks</h3>
          <div className="track-grid">
            {paths.map((path) => (
              <button
                key={path.id}
                className={`track-option ${chosen.id === path.id ? "active" : ""}`}
                onClick={() => setSelected(path.id)}
              >
                <Map size={18} />
                <span>{path.title}</span>
                {e.primary === path.id && <Check size={15} />}
              </button>
            ))}
          </div>
        </section>
        <section className="learning-panel">
          <span className="eyebrow">Track overview</span>
          <h3>{chosen.title}</h3>
          <p>{chosen.overview}</p>
          <Chips items={chosen.technologies.split(", ")} />
          <dl className="learning-details">
            {(
              [
                ["Responsibilities", "responsibilities"],
                ["Prerequisites", "prerequisites"],
                ["Milestones", "milestones"],
                ["Projects", "projects"],
                ["Assessments", "assessments"],
                ["Courses", "courses"],
                ["Optional credentials", "certifications"],
                ["Study effort", "effort"],
                ["Career preparation", "preparation"],
              ] as const
            ).map(([label, key]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{chosen[key]}</dd>
              </div>
            ))}
          </dl>
          <div className="learning-actions">
            <button
              disabled={busy}
              className="button primary"
              onClick={() => void commit((n) => ({ ...n, primary: chosen.id }))}
            >
              Choose primary
            </button>
            <button
              disabled={busy}
              className="button"
              onClick={() =>
                void commit((n) => ({
                  ...n,
                  secondary: n.secondary.includes(chosen.id)
                    ? n.secondary.filter((id) => id !== chosen.id)
                    : [...n.secondary, chosen.id],
                }))
              }
            >
              {e.secondary.includes(chosen.id)
                ? "Remove secondary"
                : "Add secondary"}
            </button>
            <button className="button" onClick={() => setEditing(chosen)}>
              Edit track
            </button>
            <button
              className="button"
              onClick={() =>
                setEditing({
                  ...chosen,
                  id: `custom-${crypto.randomUUID()}`,
                  title: "My career track",
                })
              }
            >
              Create track
            </button>
          </div>
        </section>
      </div>
      <section className="learning-panel">
        <div className="section-head">
          <div>
            <h3>Personalized prerequisite map</h3>
            <p>
              Overrides adjust the plan; they do not change evaluated evidence.
            </p>
          </div>
          <button
            className="button"
            onClick={() => props.navigate("Discover Courses")}
          >
            Explore alternative courses
          </button>
        </div>
        <div className="roadmap-grid">
          {nodes.map((node, i) => (
            <article className="roadmap-node" key={node.id}>
              <span className="eyebrow">
                Checkpoint {String(i + 1).padStart(2, "0")}
              </span>
              <h4>{node.title}</h4>
              <span className="learning-status">{node.state}</span>
              <p>{node.reason}</p>
              <small>
                Prerequisites: {node.prerequisites.join(", ") || "None"} ·
                Estimated practice: {node.minutes} min
              </small>
              <p className="muted">{node.alternative}</p>
              <label>
                Plan status
                <select
                  value={e.overrides[node.id] ?? "Automatic"}
                  disabled={busy}
                  onChange={(event) =>
                    void commit((n) => {
                      if (event.target.value === "Automatic")
                        delete n.overrides[node.id];
                      else
                        n.overrides[node.id] = event.target
                          .value as (typeof n.overrides)[string];
                      return n;
                    })
                  }
                >
                  {[
                    "Automatic",
                    "Not Started",
                    "Recommended",
                    "In Progress",
                    "Review Needed",
                    "Mastered",
                    "Completed",
                    "Optional",
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            </article>
          ))}
        </div>
      </section>
      <section className="learning-panel">
        <h3>Your planning preferences</h3>
        <div className="learning-form-grid">
          <label>
            Preferred technologies
            <input
              defaultValue={e.preferred}
              onBlur={(event) => {
                if (event.target.value !== e.preferred)
                  void commit((n) => ({ ...n, preferred: event.target.value }));
              }}
              placeholder="For example React or Laravel"
            />
          </label>
          <label>
            Course budget
            <select
              value={e.budget}
              disabled={busy}
              onChange={(event) =>
                void commit((n) => ({
                  ...n,
                  budget: event.target.value as typeof e.budget,
                }))
              }
            >
              <option>Free</option>
              <option>Any</option>
            </select>
          </label>
        </div>
        <p>
          Study schedule: {props.state.profile.weeklyHours} hours/week. Adjust
          it in Settings. Secondary goals:{" "}
          {paths
            .filter((p) => e.secondary.includes(p.id))
            .map((p) => p.title)
            .join(", ") || "None selected"}
          .
        </p>
      </section>
      {editing && (
        <Modal title="Edit career track" wide onClose={() => setEditing(null)}>
          <form
            className="learning-modal-body"
            onSubmit={(event) => {
              event.preventDefault();
              void commit((n) => ({
                ...n,
                customTracks: [
                  ...n.customTracks.filter((p) => p.id !== editing.id),
                  editing,
                ],
              })).then((ok) => {
                if (ok) setEditing(null);
              });
            }}
          >
            {(
              [
                "title",
                "overview",
                "technologies",
                "responsibilities",
                "prerequisites",
                "milestones",
                "projects",
                "assessments",
                "courses",
                "certifications",
                "effort",
                "preparation",
              ] as const
            ).map((key) => (
              <label key={key}>
                {key}
                <textarea
                  required
                  maxLength={10000}
                  value={editing[key]}
                  onChange={(event) =>
                    setEditing({ ...editing, [key]: event.target.value })
                  }
                />
              </label>
            ))}
            <label>
              Competency IDs (comma separated)
              <input
                value={editing.topics.join(", ")}
                onChange={(event) =>
                  setEditing({
                    ...editing,
                    topics: event.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean),
                  })
                }
              />
            </label>
            <button className="button primary" disabled={busy}>
              Save track
            </button>
            <Feedback message={message} />
          </form>
        </Modal>
      )}
      {diagnostic && (
        <Modal
          title="Initial skill diagnostic"
          wide
          onClose={() => setDiagnostic(false)}
        >
          <div className="learning-modal-body">
            <p>
              Concepts, code reading and debugging are evaluated here. Follow
              with an evaluated academy exercise and a submitted capstone for
              practical evidence. A self-report alone never demonstrates
              competence.
            </p>
            <div className="learning-form-grid">
              {[
                "PHP",
                "Laravel",
                "SQL",
                "JavaScript",
                "React",
                "Git",
                "GitHub Actions",
                "LLM Integration",
                "MCP",
                "Automation",
              ].map((topic) => (
                <label key={topic}>
                  {topic} · self-report
                  <select
                    aria-label={`${topic} self-reported experience`}
                    value={e.selfReported[topic] ?? "New"}
                    disabled={busy}
                    onChange={(event) =>
                      void commit((n) => ({
                        ...n,
                        selfReported: {
                          ...n.selfReported,
                          [topic]: event.target.value as
                            "New" | "Some practice" | "Experienced",
                        },
                      }))
                    }
                  >
                    {["New", "Some practice", "Experienced"].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                  <small>
                    Demonstrated:{" "}
                    {
                      mastery(e, topic === "JavaScript" ? "variables" : topic)
                        .status
                    }
                  </small>
                </label>
              ))}
            </div>
            {diagnosticQuestions.map((q, index) => (
              <fieldset className="quiz-question" key={q.id}>
                <legend>
                  {index + 1}. {q.prompt}
                </legend>
                {q.code && <pre>{q.code}</pre>}
                {q.options.map((option, i) => (
                  <label className="answer-option" key={option}>
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === i}
                      disabled={graded}
                      onChange={() => setAnswers({ ...answers, [q.id]: i })}
                    />
                    {option}
                  </label>
                ))}
                {graded && (
                  <p
                    className={
                      answers[q.id] === q.answer ? "correct" : "incorrect"
                    }
                  >
                    {answers[q.id] === q.answer
                      ? "Correct. "
                      : "Review needed. "}
                    {q.explanation}
                  </p>
                )}
              </fieldset>
            ))}
            <Meter
              label="Diagnostic questions answered"
              value={
                (Object.keys(answers).length / diagnosticQuestions.length) * 100
              }
            />
            <button
              className="button primary"
              disabled={busy || graded}
              onClick={() => void grade()}
            >
              Submit diagnostic
            </button>
            {graded && (
              <>
                <p>
                  Results saved. Correct conceptual answers provide one evidence
                  source; demonstrate a second distinct activity to support
                  mastery.
                </p>
                <button
                  className="button"
                  onClick={() => {
                    setDiagnostic(false);
                    props.navigate("Coding Academy");
                  }}
                >
                  Try a practical coding exercise
                </button>
              </>
            )}
            <Feedback message={message} />
          </div>
        </Modal>
      )}
    </div>
  );
}

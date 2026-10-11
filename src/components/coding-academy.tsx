"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import {
  Play,
  RotateCcw,
  CheckCheck,
  Code2,
  Lightbulb,
  Save,
} from "lucide-react";
import { lessons, type Lesson, BANK_VERSION } from "@/lib/academy-content";
import {
  mastery,
  recordAttempt,
  dailyChallenge,
  roadmap,
} from "@/lib/education";
import { runCode, type RunResult } from "@/lib/runner";
import { dateKey } from "@/lib/model";
import {
  useEducation,
  Feedback,
  Chips,
  type LearningProps,
} from "./education-shared";
import Tutor from "./tutor";
const CodeEditor = dynamic(() => import("./code-editor"), {
  ssr: false,
  loading: () => <p>Loading code editor…</p>,
});
const difficulty = (l: Lesson) =>
  l.tier === "Beginner"
    ? lessons.filter((n) => n.tier === "Beginner").indexOf(l) < 5
      ? "Beginner"
      : "Easy"
    : l.tier === "Intermediate"
      ? lessons.filter((n) => n.tier === "Intermediate").indexOf(l) < 6
        ? "Medium"
        : "Hard"
      : "Advanced";
export default function CodingAcademy(
  props: LearningProps & { challenge?: boolean },
) {
  const { e, commit, message, setMessage, busy } = useEducation(props),
    today = dateKey(new Date(), props.state.profile.timezone);
  const [selected, setSelected] = useState(() =>
      props.challenge
        ? dailyChallenge(e, today).id
        : (lessons.find(
            (l) =>
              l.id ===
              (
                roadmap(e).find((n) => n.state === "Review Needed") ??
                roadmap(e).find(
                  (n) =>
                    (n.state === "Recommended" || n.state === "In Progress") &&
                    !e.attempts.some(
                      (a) => a.kind === "lesson" && a.unit === n.id && a.passed,
                    ),
                )
              )?.id,
          )?.id ??
          lessons.find(
            (l) =>
              !e.attempts.some(
                (a) => a.kind === "lesson" && a.unit === l.id && a.passed,
              ),
          )?.id ??
          lessons[0].id),
    ),
    [tier, setTier] = useState("All levels"),
    [source, setSource] = useState(
      () =>
        e.drafts[selected] ?? lessons.find((l) => l.id === selected)!.starter,
    ),
    [running, setRunning] = useState(false),
    [result, setResult] = useState<RunResult | null>(null),
    [evaluated, setEvaluated] = useState(""),
    [checkpoint, setCheckpoint] = useState(""),
    [hints, setHints] = useState(0),
    [fullExplanation, setFullExplanation] = useState(false);
  const lesson = lessons.find((l) => l.id === selected)!,
    complete = e.attempts.some(
      (a) =>
        a.unit === lesson.id &&
        a.kind === (props.challenge ? "challenge" : "lesson") &&
        a.passed,
    );
  function choose(l: Lesson) {
    setSelected(l.id);
    setSource(e.drafts[l.id] ?? l.starter);
    setResult(null);
    setEvaluated("");
    setCheckpoint("");
    setHints(0);
    setFullExplanation(false);
  }
  async function run(test: boolean) {
    setRunning(true);
    setMessage("");
    try {
      const outcome = await runCode(
        source,
        test ? lesson.cases : lesson.cases.filter((c) => !c.hidden),
      );
      setResult(outcome);
      setEvaluated(test ? source : "");
      if (test && (outcome.error || outcome.results.some((r) => !r.passed)))
        await commit((n, s) =>
          recordAttempt(
            { ...n, drafts: { ...n.drafts, [lesson.id]: source } },
            {
              unit: lesson.id,
              kind: props.challenge ? "challenge" : "lesson",
              topic: lesson.topic,
              passed: false,
              score: outcome.results.length
                ? Math.round(
                    (outcome.results.filter((r) => r.passed).length /
                      lesson.cases.length) *
                      100,
                  )
                : 0,
              source: n.reviews[lesson.id]?.due <= today ? "review" : "academy",
              results: outcome.results,
              elapsed: outcome.elapsed,
            },
            s.profile.timezone,
          ),
        );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Execution failed.");
      setEvaluated("");
    } finally {
      setRunning(false);
    }
  }
  async function completeLesson() {
    if (
      evaluated !== source ||
      result?.error ||
      result?.results.length !== lesson.cases.length ||
      !result.results.every((r) => r.passed)
    ) {
      setMessage("Test this exact solution successfully before completing it.");
      return;
    }
    if (
      !props.challenge &&
      checkpoint.trim().toLowerCase() !== lesson.answer.toLowerCase()
    ) {
      setMessage(
        "Review the lesson explanation and try its checkpoint again. Successful code tests alone do not complete a lesson.",
      );
      await commit((n, s) =>
        recordAttempt(
          n,
          {
            unit: lesson.id,
            kind: "lesson",
            topic: lesson.topic,
            passed: false,
            score: 80,
            source: "checkpoint",
            answer: checkpoint,
            results: result.results,
          },
          s.profile.timezone,
        ),
      );
      setMessage(
        "Checkpoint needs review. Read the concept explanation and try again; your successful code tests are retained.",
      );
      return;
    }
    await commit((n, s) =>
      recordAttempt(
        { ...n, drafts: { ...n.drafts, [lesson.id]: source } },
        {
          unit: lesson.id,
          kind: props.challenge ? "challenge" : "lesson",
          topic: lesson.topic,
          passed: true,
          score: 100,
          source:
            n.reviews[lesson.id]?.due <= today
              ? "review"
              : props.challenge
                ? `daily:${today}`
                : "academy",
          results: result.results,
          elapsed: result.elapsed,
        },
        s.profile.timezone,
      ),
    );
  }
  async function format() {
    try {
      const [prettier, babel, estree] = await Promise.all([
        import("prettier/standalone"),
        import("prettier/plugins/babel"),
        import("prettier/plugins/estree"),
      ]);
      setSource(
        await prettier.format(source, {
          parser: "babel",
          plugins: [babel, estree],
          tabWidth: 2,
        }),
      );
      setEvaluated("");
    } catch (error) {
      setMessage(
        `Formatting needs valid JavaScript. ${error instanceof Error ? error.message : ""}`,
      );
    }
  }
  return (
    <div className="learning-page">
      <section className="learning-hero">
        <div>
          <span className="eyebrow">
            <Code2 size={15} />{" "}
            {props.challenge
              ? `Daily coding · ${today}`
              : "Coding Academy · JavaScript"}
          </span>
          <h2>
            {props.challenge
              ? "One problem. A little more confidence."
              : "Understand it. Write it. Test it."}
          </h2>
          <p>
            {props.challenge
              ? `The transparent recommendation starts with ${dailyChallenge(e, today).tier.toLowerCase()} practice, or revisits a topic with repeated errors. You can choose any problem.`
              : "25 original lessons, from fundamentals to architecture. A successful evaluated solution and a concept checkpoint complete each lesson."}
          </p>
        </div>
        <Chips
          items={[
            `Bank ${BANK_VERSION}`,
            "JavaScript execution",
            "PHP / Python execution unavailable",
          ]}
        />
      </section>
      <div className="academy-layout">
        <aside className="learning-panel lesson-list">
          <label>
            Explore difficulty
            <select
              value={tier}
              onChange={(event) => setTier(event.target.value)}
              disabled={running}
            >
              {(props.challenge
                ? [
                    "All levels",
                    "Beginner",
                    "Easy",
                    "Medium",
                    "Hard",
                    "Advanced",
                  ]
                : ["All levels", "Beginner", "Intermediate", "Advanced"]
              ).map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          {lessons
            .filter(
              (l) =>
                tier === "All levels" ||
                (props.challenge ? difficulty(l) : l.tier) === tier,
            )
            .map((l, index) => (
              <button
                key={l.id}
                disabled={running}
                onClick={() => choose(l)}
                className={l.id === selected ? "active" : ""}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  {l.title}
                  <small>
                    {l.tier} · {mastery(e, l.id).status}
                  </small>
                </div>
                {e.attempts.some(
                  (a) =>
                    a.kind === (props.challenge ? "challenge" : "lesson") &&
                    a.unit === l.id &&
                    a.passed,
                ) && <CheckCheck size={15} />}
              </button>
            ))}
        </aside>
        <section className="learning-panel exercise-panel">
          <span className="eyebrow">
            {props.challenge ? difficulty(lesson) : lesson.tier} ·{" "}
            {lesson.minutes} min ·{" "}
            {complete ? "Completed" : "Open for practice"}
          </span>
          <h3>{lesson.title}</h3>
          <h4>Learning objective</h4>
          <p>{lesson.objective}</p>
          {!props.challenge && (
            <>
              <h4>Understand the concept</h4>
              <p>{lesson.explanation}</p>
              <h4>Worked example</h4>
              <pre>{lesson.example}</pre>
            </>
          )}
          <h4>{props.challenge ? "Your challenge" : "Your exercise"}</h4>
          <p>{lesson.task}</p>
          <p className="muted">
            Constraints: use function solve(input); return the result. Test
            inputs follow the types shown below; up to 3 seconds total, 30,000
            source characters. Imports, real network requests, PHP and native
            TypeScript compilation are unavailable.
          </p>
          <div className="test-example">
            <span>Example input</span>
            <code>{JSON.stringify(lesson.cases[0].args[0])}</code>
            <span>Expected output</span>
            <code>{JSON.stringify(lesson.cases[0].expected)}</code>
          </div>
          <p>
            Prerequisites: {lesson.prerequisites.join(", ") || "None"}. These
            guide your learning and do not lock this exercise.
          </p>
          <CodeEditor
            value={source}
            onChange={(value) => {
              setSource(value);
              setEvaluated("");
            }}
          />
          <div className="learning-actions">
            <button
              className="button"
              disabled={running || busy}
              onClick={() => void run(false)}
            >
              <Play size={15} />
              Run Code
            </button>
            <button
              className="button primary"
              disabled={running || busy}
              onClick={() => void run(true)}
            >
              <CheckCheck size={15} />
              {running ? "Executing…" : "Test Solution"}
            </button>
            <button
              className="button"
              disabled={running}
              onClick={() => void format()}
            >
              Format
            </button>
            <button
              className="button"
              disabled={running || busy}
              onClick={() =>
                void commit((n) => ({
                  ...n,
                  drafts: { ...n.drafts, [lesson.id]: source },
                }))
              }
            >
              <Save size={15} />
              Save progress
            </button>
            <button
              className="button"
              disabled={running}
              onClick={() => {
                setSource(lesson.starter);
                setResult(null);
                setEvaluated("");
                setCheckpoint("");
              }}
            >
              <RotateCcw size={15} />
              Reset / retry
            </button>
          </div>
          <Feedback message={message} />
          {result && (
            <section className="runner-output" aria-live="polite">
              <h4>
                {evaluated
                  ? "Evaluation results"
                  : "Example run (does not award completion)"}
              </h4>
              {result.error && <p className="incorrect">{result.error}</p>}
              {result.results.map((r, i) => (
                <div key={i} className="test-row">
                  <span className={r.passed ? "correct" : "incorrect"}>
                    {r.passed ? "PASS" : "FAIL"}
                  </span>
                  <span>
                    {lesson.cases[i]?.hidden
                      ? "Additional evaluation case"
                      : r.label}
                  </span>
                  {!lesson.cases[i]?.hidden && <code>{r.actual}</code>}
                </div>
              ))}
              {result.results.some((r) => !r.passed) && (
                <p>
                  Compare your returned value with the required type and
                  boundary behavior. Check empty inputs and the last index.{" "}
                  {lesson.hints[0]}
                </p>
              )}
              <p>
                Elapsed: {result.elapsed.toFixed(1)} ms in this browser. This
                measurement does not establish algorithmic complexity.
              </p>
              <h4>Console output</h4>
              <pre>{result.logs.join("\n") || "No console output."}</pre>
            </section>
          )}
          <div className="hint-panel">
            <h4>
              <Lightbulb size={16} /> Teaching hints
            </h4>
            {lesson.hints.slice(0, hints).map((h, i) => (
              <p key={h}>
                {i + 1}. {h}
              </p>
            ))}
            <div className="learning-actions">
              <button
                className="button"
                disabled={hints >= lesson.hints.length}
                onClick={() => setHints(hints + 1)}
              >
                Reveal next hint
              </button>
              <button
                className="button"
                onClick={() => setFullExplanation(!fullExplanation)}
              >
                {fullExplanation ? "Hide" : "Request full explanation"}
              </button>
            </div>
            {(fullExplanation || complete) && (
              <>
                <p>{lesson.explanation}</p>
                <pre>{lesson.solution}</pre>
                <p>
                  This reference solution demonstrates one approach. Explain its
                  behavior and edge cases in your own words before moving on.
                </p>
              </>
            )}
          </div>
          {!props.challenge && (
            <label>
              Completion checkpoint: {lesson.checkpoint}
              <input
                value={checkpoint}
                disabled={running}
                onChange={(event) => setCheckpoint(event.target.value)}
                placeholder="Write a short answer"
              />
            </label>
          )}
          <button
            className="button primary"
            disabled={running || busy || !evaluated || evaluated !== source}
            onClick={() => void completeLesson()}
          >
            {props.challenge
              ? "Submit evaluated challenge"
              : "Complete lesson & checkpoint"}
          </button>
          <Tutor
            context={lesson.title + ": " + lesson.explanation}
            code={source}
          />
          {complete &&
            !props.challenge &&
            lessons.some(
              (l) =>
                !e.attempts.some(
                  (a) => a.kind === "lesson" && a.unit === l.id && a.passed,
                ),
            ) && (
              <button
                className="button"
                onClick={() => {
                  const next = lessons.find(
                    (l) =>
                      !e.attempts.some(
                        (a) =>
                          a.kind === "lesson" && a.unit === l.id && a.passed,
                      ),
                  );
                  if (next) choose(next);
                }}
              >
                Continue to the next suggested lesson
              </button>
            )}
          <p className="muted">
            XP is awarded once per reviewed activity. Repeated practice still
            contributes to review history. Extra evaluation cases are withheld
            from the exercise UI, but client-side banks are inspectable and do
            not provide exam secrecy.
          </p>
        </section>
      </div>
    </div>
  );
}

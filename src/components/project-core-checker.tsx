"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { runCode, type RunResult } from "@/lib/runner";
import { recordAttempt } from "@/lib/education";
import { useEducation, Feedback, type LearningProps } from "./education-shared";
const CodeEditor = dynamic(() => import("./code-editor"), { ssr: false });
const cases = [
  { label: "Addition", args: [{ a: 2, b: 3, operation: "+" }], expected: 5 },
  {
    label: "Subtraction",
    args: [{ a: 2, b: 3, operation: "-" }],
    expected: -1,
  },
  {
    label: "Multiplication",
    args: [{ a: -2, b: 3, operation: "*" }],
    expected: -6,
  },
  { label: "Division", args: [{ a: 9, b: 3, operation: "/" }], expected: 3 },
  {
    label: "Division by zero",
    args: [{ a: 9, b: 0, operation: "/" }],
    expected: null,
  },
  {
    label: "Unknown operation",
    args: [{ a: 2, b: 3, operation: "?" }],
    expected: null,
  },
];
export default function ProjectCoreChecker(props: LearningProps) {
  const { commit, message, setMessage } = useEducation(props),
    [source, setSource] = useState(
      "function solve(input) {\n  // input: { a, b, operation }\n  // Return a result for + - * /; null for division by zero or unknown operations.\n}\n",
    ),
    [result, setResult] = useState<RunResult | null>(null),
    [running, setRunning] = useState(false);
  async function test() {
    setRunning(true);
    try {
      const outcome = await runCode(source, cases);
      setResult(outcome);
      await commit((n, s) =>
        recordAttempt(
          n,
          {
            unit: "capstone-calculator",
            kind: "assessment",
            topic: "architecture",
            passed:
              !outcome.error &&
              outcome.results.length === cases.length &&
              outcome.results.every((r) => r.passed),
            score:
              (outcome.results.filter((r) => r.passed).length / cases.length) *
              100,
            source: "pasted-project-core",
            results: outcome.results,
            elapsed: outcome.elapsed,
          },
          s.profile.timezone,
        ),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Execution failed.");
    } finally {
      setRunning(false);
    }
  }
  return (
    <section className="project-core-checker">
      <h4>Optional automated calculator-core check</h4>
      <p>
        Paste your standalone calculation function here. Only this submitted
        function is executed; the repository, UI, and documentation are not
        inspected. Return null for an unsupported operation or division by zero.
      </p>
      <CodeEditor value={source} onChange={setSource} />
      <button
        type="button"
        className="button"
        disabled={running}
        onClick={() => void test()}
      >
        {running ? "Evaluating…" : "Evaluate pasted calculator core"}
      </button>
      {result && (
        <div className="runner-output">
          <p>{result.error}</p>
          {result.results.map((r) => (
            <div className="test-row" key={r.label}>
              <span className={r.passed ? "correct" : "incorrect"}>
                {r.passed ? "PASS" : "FAIL"}
              </span>
              <span>{r.label}</span>
              <code>{r.actual}</code>
            </div>
          ))}
        </div>
      )}
      <Feedback message={message} />
    </section>
  );
}

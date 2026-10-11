"use client";
import { useState } from "react";
import { questions, type Question } from "@/lib/academy-content";
import { dailyQuestion, recordAttempt } from "@/lib/education";
import { dateKey } from "@/lib/model";
import { useEducation, Feedback, type LearningProps } from "./education-shared";
export function KnowledgeQuiz(props: LearningProps & { arcade?: boolean }) {
  const { e, commit, message, busy } = useEducation(props),
    day = dateKey(new Date(), props.state.profile.timezone),
    [game, setGame] = useState("Bug Hunter"),
    [question, setQuestion] = useState<Question>(() =>
      props.arcade
        ? questions.find((q) => q.format === "Identify the bug")!
        : dailyQuestion(e, day),
    ),
    [answer, setAnswer] = useState<number | null>(null),
    [graded, setGraded] = useState(false),
    [topic, setTopic] = useState("Adaptive selection");
  function next(mode = game, selectedTopic = topic) {
    const bank = props.arcade
      ? questions.filter(
          (q) =>
            q.format ===
            (mode === "Bug Hunter" ? "Identify the bug" : "Code output"),
        )
      : selectedTopic === "Adaptive selection"
        ? questions
        : questions.filter((q) => q.topic === selectedTopic);
    const unseen = bank.filter(
      (q) =>
        !e.attempts.some(
          (a) => a.unit === q.id && a.source === (props.arcade ? mode : "quiz"),
        ),
    );
    const due = bank.filter((q) => e.reviews[q.id]?.due <= day);
    const choices = due.length ? due : unseen.length ? unseen : bank;
    setQuestion(choices.find((q) => q.id !== question.id) ?? choices[0]);
    setAnswer(null);
    setGraded(false);
  }
  async function submit() {
    if (answer === null) return;
    const passed = answer === question.answer;
    const ok = await commit((n, s) =>
      recordAttempt(
        n,
        {
          unit: question.id,
          kind: props.arcade ? "game" : "question",
          topic: question.topic,
          passed,
          score: passed ? 100 : 0,
          source: props.arcade
            ? game
            : n.reviews[question.id]?.due <= day
              ? "review"
              : "quiz",
          answer: question.options[answer],
        },
        s.profile.timezone,
      ),
    );
    if (ok) setGraded(true);
  }
  const history = e.attempts.filter(
    (a) => a.kind === (props.arcade ? "game" : "question"),
  );
  const recent = history.slice(-10),
    prior = history.slice(-20, -10),
    accuracy = (items: typeof history) =>
      items.length
        ? Math.round(
            (items.filter((a) => a.passed).length / items.length) * 100,
          )
        : 0;
  return (
    <section className="learning-panel knowledge-panel">
      <div className="section-head">
        <div>
          <span className="eyebrow">
            {props.arcade
              ? "Code Arcade · deterministic evaluation"
              : `Daily quiz · ${day}`}
          </span>
          <h3>{props.arcade ? game : "A knowledge check worth taking"}</h3>
        </div>
        {props.arcade ? (
          <select
            aria-label="Choose coding game"
            value={game}
            onChange={(event) => {
              setGame(event.target.value);
              next(event.target.value);
            }}
          >
            <option>Bug Hunter</option>
            <option>Output Predictor</option>
          </select>
        ) : (
          <select
            aria-label="Choose quiz topic"
            value={topic}
            onChange={(event) => {
              setTopic(event.target.value);
              next(game, event.target.value);
            }}
          >
            {[
              "Adaptive selection",
              ...new Set(questions.map((q) => q.topic)),
            ].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        )}
      </div>
      <p>
        {props.arcade
          ? "Inspect the snippet, choose your answer and use the explanation to test your reasoning. A correct answer earns XP only once for that question across quiz and arcade."
          : "Due reviews take priority. Incorrect answers schedule a next-day review; correct reviews increase the interval up to 90 days. Explore any topic."}
      </p>
      <span className="learning-status">
        {question.topic} · {question.format}
      </span>
      <fieldset className="quiz-question">
        <legend>{question.prompt}</legend>
        {question.code && <pre>{question.code}</pre>}
        {question.options.map((option, index) => (
          <label
            className={`answer-option ${graded && index === question.answer ? "answer-correct" : ""}`}
            key={option}
          >
            <input
              type="radio"
              name={props.arcade ? "arcade-answer" : "daily-quiz-answer"}
              checked={answer === index}
              disabled={graded || busy}
              onChange={() => setAnswer(index)}
            />
            {option}
          </label>
        ))}
      </fieldset>
      <div className="learning-actions">
        <button
          className="button primary"
          disabled={answer === null || graded || busy}
          onClick={() => void submit()}
        >
          Check answer
        </button>
        <button className="button" disabled={busy} onClick={() => next()}>
          Next exercise
        </button>
      </div>
      {graded && (
        <div className="hint-panel">
          <h4 className={answer === question.answer ? "correct" : "incorrect"}>
            {answer === question.answer ? "Correct" : "Review this concept"}
          </h4>
          <p>{question.explanation}</p>
          <p>Correct answer: {question.options[question.answer]}</p>
        </div>
      )}
      <Feedback message={message} />
      <div className="learning-stats">
        <div>
          <strong>{history.length}</strong>
          <span>Evaluated attempts</span>
        </div>
        <div>
          <strong>{accuracy(recent)}%</strong>
          <span>Last 10 accuracy</span>
        </div>
        <div>
          <strong>
            {prior.length ? `${accuracy(recent) - accuracy(prior)} pp` : "—"}
          </strong>
          <span>Change from prior 10</span>
        </div>
        <div>
          <strong>
            {Object.values(e.reviews).filter((r) => r.due <= day).length}
          </strong>
          <span>Activities due for review</span>
        </div>
      </div>
      {history.length > 0 && (
        <details>
          <summary>Answer and review history</summary>
          <div className="learning-history">
            {history
              .slice(-20)
              .reverse()
              .map((a) => (
                <div key={a.id}>
                  <span>
                    {a.day} · {a.topic}
                  </span>
                  <span>
                    {a.answer} · {a.passed ? "Correct" : "Incorrect"}
                  </span>
                </div>
              ))}
          </div>
        </details>
      )}
    </section>
  );
}

"use client";
import { useEffect, useState } from "react";
import { Play, Pause, Square, Clock3, Coffee } from "lucide-react";
import {
  dateKey,
  pauseTimer,
  timerSeconds,
  type State,
  type Timer,
  type RecordItem,
} from "@/lib/model";
export default function StudyTimer({
  state,
  owner,
  save,
  onLog,
}: {
  state: State;
  owner: string;
  save: (next: State) => Promise<void>;
  onLog: (r: Partial<RecordItem>) => void;
}) {
  const [mode, setMode] = useState<Timer["mode"]>("Pomodoro"),
    [duration, setDuration] = useState(25),
    [courseId, setCourse] = useState(""),
    [skill, setSkill] = useState(""),
    [now, setNow] = useState(Date.now()),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const timer = state.timer,
    elapsed = timer ? timerSeconds(timer, now) : 0,
    other = !!timer && timer.owner !== owner;
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Timer could not be saved.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (
      timer?.status === "running" &&
      timer.duration &&
      elapsed >= timer.duration &&
      !busy &&
      !other
    )
      void act(() => save({ ...state, timer: pauseTimer(timer) }));
  }, [elapsed]); // Wall-clock duration is capped at the selected focus/break duration.
  const remaining = (timer?.duration || duration * 60) - elapsed;
  const display = timer?.mode === "Focus" ? elapsed : Math.max(0, remaining);
  return (
    <section className="timer-panel panel">
      <div className="section-head">
        <div className="eyebrow">
          <Clock3 size={15} /> FOCUS SPACE
        </div>
        <span className="badge">
          {timer?.status === "running"
            ? "Focusing"
            : timer
              ? "Paused"
              : "Ready when you are"}
        </span>
      </div>
      <h2>Make time for progress.</h2>
      <p className="muted">One focused session. One step forward.</p>
      <div className="timer-digits" aria-label="Timer">
        {Math.floor(display / 60)
          .toString()
          .padStart(2, "0")}
        <span>:</span>
        {Math.floor(display % 60)
          .toString()
          .padStart(2, "0")}
      </div>
      <div className="timer-options">
        <label>
          Mode
          <select
            disabled={!!timer}
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as Timer["mode"]);
              setDuration(e.target.value === "Break" ? 5 : 25);
            }}
          >
            <option>Pomodoro</option>
            <option>Focus</option>
            <option>Break</option>
          </select>
        </label>
        <label>
          Minutes
          <input
            type="number"
            min={1}
            max={180}
            value={duration}
            disabled={!!timer}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </label>
        <label>
          Course
          <select
            disabled={!!timer}
            value={courseId}
            onChange={(e) => setCourse(e.target.value)}
          >
            <option value="">General study</option>
            {state.records.courses
              .filter((c) => !c.archived)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
          </select>
        </label>
        <label>
          Skill
          <input
            disabled={!!timer}
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            placeholder="e.g. JavaScript"
          />
        </label>
      </div>
      <div className="timer-controls">
        {!timer ? (
          <button
            className="button primary"
            disabled={busy || duration < 1 || duration > 180}
            onClick={() =>
              void act(() =>
                save({
                  ...state,
                  timer: {
                    status: "running",
                    startedAt: Date.now(),
                    seconds: 0,
                    duration: duration * 60,
                    mode,
                    courseId,
                    skill,
                    owner,
                  },
                }),
              )
            }
          >
            <Play size={16} />
            Start session
          </button>
        ) : (
          <>
            <button
              className="button primary"
              disabled={
                busy ||
                (other && timer.status === "running") ||
                (!!timer.duration && elapsed >= timer.duration)
              }
              onClick={() =>
                void act(() =>
                  save({
                    ...state,
                    timer:
                      timer.status === "running"
                        ? pauseTimer(timer)
                        : {
                            ...timer,
                            status: "running",
                            startedAt: Date.now(),
                            owner,
                          },
                  }),
                )
              }
            >
              {timer.status === "running" ? (
                <Pause size={16} />
              ) : (
                <Play size={16} />
              )}{" "}
              {timer.status === "running" ? "Pause" : "Resume"}
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() => {
                if (
                  other &&
                  !confirm("Take over and finish the timer from the other tab?")
                )
                  return;
                void act(async () => {
                  const seconds = timerSeconds(timer);
                  const stamp = new Date().toISOString();
                  const record: RecordItem = {
                    id: crypto.randomUUID(),
                    title: "Focus session",
                    date: dateKey(new Date(), state.profile.timezone),
                    minutes: Math.round((seconds / 60) * 10) / 10,
                    courseId: timer.courseId,
                    skill: timer.skill,
                    createdAt: stamp,
                    updatedAt: stamp,
                  };
                  const log = timer.mode !== "Break" && seconds >= 60;
                  await save({
                    ...state,
                    timer: null,
                    records: log
                      ? {
                          ...state.records,
                          sessions: [...state.records.sessions, record],
                        }
                      : state.records,
                  });
                  if (log) onLog(record);
                });
              }}
            >
              <Square size={14} />
              {timer.mode === "Break" ? "End break" : "Finish & log"}
            </button>
          </>
        )}
        {timer && (
          <button
            className="text-button danger"
            disabled={busy}
            onClick={() => {
              if (confirm("Discard this timer without logging it?"))
                void act(() => save({ ...state, timer: null }));
            }}
          >
            Discard
          </button>
        )}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {other && (
        <p className="notice">
          This timer belongs to another tab. Reload that tab to control it, or
          finish it here.
        </p>
      )}
      <p className="timer-note">
        <Coffee size={14} />
        Breaks are never logged as study time. The timer pauses when you leave
        this tab. Sessions under one minute are not logged.
      </p>
    </section>
  );
}

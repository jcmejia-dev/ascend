"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Compass, HelpCircle, Sparkles } from "lucide-react";
import { emptyEducation, allTracks, roadmap } from "@/lib/education";
import { lessons } from "@/lib/academy-content";
import { applyAssistance } from "@/lib/learning-assistant";
import { recommendResources } from "@/lib/discovery";
import { liveCourseSchema } from "@/lib/assistant-schema";
import { accountRequest } from "@/lib/account";
import { dateKey } from "@/lib/model";
import { Modal } from "./ui";
import type { LearningProps } from "./education-shared";
export default function LearningAssistant(
  props: LearningProps & {
    page: string;
    tutorialRequested: boolean;
    closeTutorial: () => void;
  },
) {
  const e = props.state.education ?? emptyEducation(),
    a = e.assistant,
    current = useRef(props);
  current.current = props;
  const clean =
    !e.primary &&
    !e.attempts.length &&
    [
      "courses",
      "certificates",
      "practice",
      "projects",
      "sessions",
      "goals",
    ].every(
      (k) => !props.state.records[k as keyof typeof props.state.records].length,
    );
  const [open, setOpen] = useState(!a.onboarded && !a.dismissed && clean),
    [step, setStep] = useState(0),
    [goal, setGoal] = useState(e.primary || "software"),
    [minutes, setMinutes] = useState(a.minutes),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [searching, setSearching] = useState(false);
  const automatic = useRef(false),
    lastTried = useRef(""),
    [refreshTick, setRefreshTick] = useState(0),
    today = dateKey(new Date(), props.state.profile.timezone);
  useEffect(() => {
    if (props.tutorialRequested) {
      setGoal(e.primary || "software");
      setMinutes(a.minutes);
      setStep(0);
      setOpen(true);
    }
  }, [props.tutorialRequested]);
  async function find(goalId: string) {
    const state = current.current.state,
      education = state.education ?? emptyEducation(),
      track = allTracks(education).find((t) => t.id === goalId);
    try {
      const data = await accountRequest(
        "/api/course-search?q=" +
          encodeURIComponent(track?.technologies || "programming"),
      );
      return {
        live: liveCourseSchema.array().max(60).parse(data.courses),
        searchedAt: new Date().toISOString(),
        searchGoal: goalId,
        searchStatus: String(data.status).slice(0, 500),
      };
    } catch {
      return {
        live: education.assistant.live,
        searchedAt: new Date().toISOString(),
        searchGoal: goalId,
        searchStatus:
          "Live catalogues could not be reached. Your saved and curated recommendations remain available.",
      };
    }
  }
  useEffect(() => {
    if (!a.enabled || open || automatic.current) return;
    const stale =
      a.searchGoal !== e.primary ||
      !a.searchedAt ||
      Date.now() - Date.parse(a.searchedAt) > 24 * 60 * 60 * 1000;
    if (!stale && e.plans[today]) return;
    const key = e.primary + ":" + today + ":" + a.searchedAt;
    if (lastTried.current === key) return;
    lastTried.current = key;
    automatic.current = true;
    let cancelled = false;
    (async () => {
      try {
        if (stale) setSearching(true);
        const result = stale ? await find(e.primary) : null;
        if (cancelled) return;
        const s = current.current.state,
          n = structuredClone(s.education ?? emptyEducation());
        if (n.primary !== e.primary) return;
        if (result) {
          if (n.assistant.searchGoal !== n.primary) delete n.plans[today];
          n.assistant = { ...n.assistant, ...result };
        }
        await current.current.save(applyAssistance({ ...s, education: n }));
      } catch (error) {
        if (!cancelled)
          setMessage(
            error instanceof Error
              ? error.message
              : "Could not refresh your plan.",
          );
      } finally {
        automatic.current = false;
        setSearching(false);
        setRefreshTick((t) => t + 1);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    a.enabled,
    a.searchGoal,
    a.searchedAt,
    e.primary,
    today,
    open,
    refreshTick,
  ]);
  async function dismiss() {
    setBusy(true);
    try {
      const s = current.current.state,
        n = structuredClone(s.education ?? emptyEducation());
      n.assistant.dismissed = true;
      await props.save({ ...s, education: n });
      setOpen(false);
      props.closeTutorial();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not save your preference.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function start() {
    setBusy(true);
    setMessage("Finding courses and building your plan…");
    try {
      const result = await find(goal),
        s = current.current.state,
        n = structuredClone(s.education ?? emptyEducation());
      if (n.primary !== goal) delete n.plans[today];
      n.primary = goal;
      n.assistant = {
        ...n.assistant,
        ...result,
        enabled: true,
        onboarded: true,
        dismissed: false,
        minutes,
      };
      if (n.plans[today]?.minutes !== minutes) delete n.plans[today];
      await props.save(applyAssistance({ ...s, education: n }));
      setOpen(false);
      props.closeTutorial();
      props.navigate("Dashboard");
      setMessage(
        "Your plan is ready. Start the next lesson; progress will be recorded automatically.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not build your plan.",
      );
    } finally {
      setBusy(false);
    }
  }
  const nodes = roadmap(e),
    next =
      lessons.find(
        (l) =>
          l.id ===
            (
              nodes.find((n) => n.state === "Review Needed") ??
              nodes.find(
                (n) => n.state === "Recommended" || n.state === "In Progress",
              )
            )?.id &&
          !e.attempts.some(
            (at) => at.kind === "lesson" && at.unit === l.id && at.passed,
          ),
      ) ??
      lessons.find(
        (l) =>
          !e.attempts.some(
            (at) => at.kind === "lesson" && at.unit === l.id && at.passed,
          ),
      );
  const active =
      props.state.records.courses.find(
        (c) => c.status === "In Progress" && c.assistantTrack === e.primary,
      ) ?? props.state.records.courses.find((c) => c.status === "In Progress"),
    track = allTracks(e).find((t) => t.id === e.primary);
  return (
    <>
      {props.page === "Dashboard" && (
        <section className="assistant-panel">
          <div>
            <span className="eyebrow">
              <Sparkles size={15} /> Your learning assistant
            </span>
            <h2>
              {a.enabled
                ? "Your next step is ready."
                : "Let ASCEND organise the learning."}
            </h2>
            <p>
              {a.enabled
                ? `${track?.title || "Your direction"} · ${a.minutes} minutes a day. Courses, practice and weekly goals are organised for you.`
                : "A short guide, an automatic course queue and a daily plan. You can edit every recommendation."}
            </p>
          </div>
          <div className="learning-actions">
            {a.enabled && next ? (
              <button
                className="button primary"
                onClick={() => props.navigate("Coding Academy")}
              >
                Start next lesson: {next.title}
                <ArrowRight size={15} />
              </button>
            ) : (
              <button
                className="button primary"
                onClick={() => {
                  setStep(0);
                  setOpen(true);
                }}
              >
                Set up my assisted plan
                <ArrowRight size={15} />
              </button>
            )}
            <button
              className="button"
              onClick={() => {
                setStep(0);
                setOpen(true);
              }}
            >
              <HelpCircle size={15} /> Getting started guide
            </button>
            {a.enabled && (
              <button
                className="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const s = current.current.state,
                      n = structuredClone(s.education ?? emptyEducation());
                    n.assistant.enabled = false;
                    await props.save({ ...s, education: n });
                    setMessage(
                      "Assistance paused. Your existing records remain available.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Pause assistance
              </button>
            )}
          </div>
          {a.enabled && (
            <>
              <p className="assistant-next">
                <Compass size={15} />{" "}
                {active
                  ? `External course ready: ${active.title}`
                  : "Your course queue will update as you learn."}
              </p>
              <p className="muted">
                {searching
                  ? "Checking official catalogues online…"
                  : a.searchStatus || "Saved recommendations are ready."}{" "}
                {a.searchedAt &&
                  `Last search: ${new Date(a.searchedAt).toLocaleDateString()}`}
              </p>
              <p className="muted">
                ASCEND tracks academy results automatically. External sites do
                not share your completion or credentials with ASCEND.
              </p>
            </>
          )}
          {message && !open && <p role="status">{message}</p>}
        </section>
      )}
      {open && (
        <Modal
          title="Your ASCEND getting started guide"
          onClose={() => {
            if (!busy) void dismiss();
          }}
        >
          <div className="guide-body">
            <div className="guide-steps" aria-label={`Step ${step + 1} of 3`}>
              {["Your direction", "Your automatic plan", "How to learn"].map(
                (label, i) => (
                  <span key={label} className={step === i ? "active" : ""}>
                    {i + 1}. {label}
                  </span>
                ),
              )}
            </div>
            {step === 0 && (
              <>
                <span className="eyebrow">
                  A little direction. Less paperwork.
                </span>
                <h3>Tell ASCEND where you want to go.</h3>
                <p>
                  You can keep the suggested direction and start immediately.
                  Change it any time in Career Paths.
                </p>
                <label>
                  Learning direction
                  <select
                    value={goal}
                    onChange={(event) => setGoal(event.target.value)}
                  >
                    {allTracks(e).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Daily learning time
                  <select
                    value={minutes}
                    onChange={(event) => setMinutes(Number(event.target.value))}
                  >
                    {[15, 30, 45, 60, 90].map((n) => (
                      <option key={n} value={n}>
                        {n} minutes
                      </option>
                    ))}
                  </select>
                </label>
                <p className="muted">
                  Free learning materials are the default. Provider certificates
                  can have separate requirements or fees.
                </p>
              </>
            )}
            {step === 1 && (
              <>
                <span className="eyebrow">The system does the organising</span>
                <h3>Your plan builds itself.</h3>
                <ul className="guide-list">
                  <li>
                    <strong>Course discovery.</strong> ASCEND checks live
                    Harvard CS50 and Stanford SEE catalogues and combines them
                    with saved official resources.
                  </li>
                  <li>
                    <strong>My Learning.</strong> Up to three suitable resources
                    are added without filling in course forms. The first is
                    ready to study.
                  </li>
                  <li>
                    <strong>Daily and weekly goals.</strong> A manageable plan
                    appears automatically. Successful exercises update it and
                    count toward your weekly target.
                  </li>
                  <li>
                    <strong>Your control.</strong> Edit, pause or remove
                    recommendations. Removing a recommendation prevents it from
                    being added again.
                  </li>
                </ul>
                <p className="muted">
                  Adding a course organises your ASCEND workspace. It does not
                  enrol you with the provider or claim that you completed it.
                </p>
              </>
            )}
            {step === 2 && (
              <>
                <span className="eyebrow">Read. Try. Understand.</span>
                <h3>Start with one small activity.</h3>
                <ol className="guide-list">
                  <li>
                    Press <strong>Start next lesson</strong> on Dashboard.
                  </li>
                  <li>
                    Read the objective and worked example, then write your
                    solution in Coding Academy.
                  </li>
                  <li>
                    Use <strong>Run Code</strong>,{" "}
                    <strong>Test Solution</strong> and hints. Complete the short
                    checkpoint to record the lesson.
                  </li>
                  <li>
                    Use the suggested next lesson or today's challenge.
                    Progress, goals, XP and reviews update automatically.
                  </li>
                </ol>
                <p>
                  Discover Courses explains the recommendations. My Learning
                  holds external resources. Progress shows your demonstrated
                  skills. Certificates stores credentials you actually earned.
                </p>
                <p className="muted">
                  External provider activity cannot be verified automatically.
                  Confirm its completion or attach a certificate when you have
                  one; ASCEND never invents achievements.
                </p>
              </>
            )}
            {message && <p role="status">{message}</p>}
            <div className="learning-actions">
              {step > 0 && (
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => setStep(step - 1)}
                >
                  Back
                </button>
              )}
              {step < 2 ? (
                <button
                  className="button primary"
                  onClick={() => setStep(step + 1)}
                >
                  Next: {step === 0 ? "your automatic plan" : "how to learn"}
                  <ArrowRight size={15} />
                </button>
              ) : (
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => void start()}
                >
                  {busy ? "Building your plan…" : "Start my assisted plan"}
                  <ArrowRight size={15} />
                </button>
              )}
              <button
                className="button"
                disabled={busy}
                onClick={() => void dismiss()}
              >
                Explore on my own
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

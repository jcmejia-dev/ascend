import { emptyEducation, allTracks, dailyPlan } from "./education.js";
import { recommendResources } from "./discovery.js";
import { dateKey, addDays, goalProgress, type State } from "./model.js";
export const canonicalCourseUrl = (url: string) => {
  try {
    const u = new URL(url);
    u.hash = "";
    u.search = "";
    return u.href.replace(/\/$/, "");
  } catch {
    return url;
  }
};
export function preserveAssistantEdits(next: State, previous: State): State {
  const e = next.education;
  if (!e?.assistant.enabled) return next;
  const removed = [...previous.records.courses, ...previous.records.goals]
    .filter(
      (r) =>
        r.assistantManaged &&
        ![...next.records.courses, ...next.records.goals].some(
          (n) => n.id === r.id,
        ),
    )
    .map((r) =>
      String(r.assistantKey || canonicalCourseUrl(String(r.url || ""))),
    );
  if (!removed.length) return next;
  return {
    ...next,
    education: {
      ...e,
      assistant: {
        ...e.assistant,
        excluded: [...new Set([...e.assistant.excluded, ...removed])].slice(
          -200,
        ),
      },
    },
  };
}
export function applyAssistance(input: State, now = new Date()): State {
  const original = input.education ?? emptyEducation();
  if (!original.assistant.enabled) return input;
  const e = structuredClone(original),
    state = {
      ...input,
      education: e,
      records: {
        ...input.records,
        courses: [...input.records.courses],
        goals: [...input.records.goals],
      },
    };
  if (!e.primary) e.primary = "software";
  const today = dateKey(now, state.profile.timezone),
    stamp = now.toISOString();
  const existing = new Set(
    state.records.courses.map((c) => canonicalCourseUrl(String(c.url || ""))),
  );
  const managed = state.records.courses.filter(
    (c) =>
      c.assistantManaged &&
      c.assistantTrack === e.primary &&
      c.status !== "Completed" &&
      !c.archived &&
      c.status !== "Archived",
  ).length;
  let slots = Math.max(0, 3 - managed);
  for (const resource of recommendResources(state)) {
    const key = canonicalCourseUrl(resource.url);
    if (
      !slots ||
      existing.has(key) ||
      e.assistant.excluded.includes(key) ||
      resource.type === "Resource hub"
    )
      continue;
    // Advanced resources remain discoverable, but are not assigned to a new learner.
    if (
      /good programming skills|follow-up|picks up where|machine learning|convex|robotics|paradigms|abstractions/i.test(
        resource.prerequisites +
          " " +
          resource.title +
          " " +
          resource.description,
      ) &&
      e.attempts.filter((a) => a.kind === "lesson" && a.passed).length < 7
    )
      continue;
    if (resource.score <= 0) continue;
    state.records.courses.push({
      id: crypto.randomUUID(),
      createdAt: stamp,
      updatedAt: stamp,
      title: resource.title,
      provider: resource.provider,
      url: resource.url,
      catalogId: resource.id,
      skills: resource.topics,
      description: resource.description,
      status: "Planned",
      totalLessons: 0,
      completedLessons: 0,
      estimatedHours: resource.estimatedHours,
      assistantManaged: true,
      assistantKey: key,
      assistantReason: resource.reason,
      assistantTrack: e.primary,
    });
    existing.add(key);
    slots--;
  }
  if (
    !state.records.courses.some(
      (c) =>
        c.status === "In Progress" &&
        (!c.assistantManaged || c.assistantTrack === e.primary),
    )
  ) {
    const next = state.records.courses.find(
      (c) =>
        c.assistantManaged &&
        c.assistantTrack === e.primary &&
        c.status === "Planned" &&
        !c.archived,
    );
    if (next) {
      const index = state.records.courses.indexOf(next);
      state.records.courses[index] = {
        ...next,
        status: "In Progress",
        updatedAt: stamp,
      };
    }
  }
  const date = new Date(today + "T12:00:00Z"),
    monday = addDays(today, -((date.getUTCDay() + 6) % 7)),
    goalKey = "assistant-week-" + monday;
  if (
    !state.records.goals.some((g) => g.assistantKey === goalKey) &&
    !e.assistant.excluded.includes(goalKey)
  )
    state.records.goals.push({
      id: crypto.randomUUID(),
      createdAt: stamp,
      updatedAt: stamp,
      title: "Complete five learning activities this week",
      description:
        "Successful lessons, quizzes and challenges count automatically. Repeating the same activity does not inflate the target.",
      metric: "Learning activities",
      targetValue: 5,
      startDate: monday,
      dueDate: addDays(monday, 6),
      status: "Active",
      assistantManaged: true,
      assistantKey: goalKey,
    });
  for (let i = 0; i < state.records.goals.length; i++) {
    const goal = state.records.goals[i];
    if (
      goal.assistantManaged &&
      goal.status === "Active" &&
      goalProgress(goal, state) >= Number(goal.targetValue)
    )
      state.records.goals[i] = {
        ...goal,
        status: "Completed",
        updatedAt: stamp,
      };
  }
  const plan = e.plans[today] ?? dailyPlan(state, today, e.assistant.minutes);
  const passed = e.attempts.filter((a) => a.passed && a.day === today);
  e.plans[today] = {
    ...plan,
    tasks: plan.tasks.map((task) => ({
      ...task,
      done:
        task.done ||
        ((task.id === "lesson" || task.id === "review") &&
          passed.some(
            (a) =>
              a.kind === "lesson" &&
              (task.id !== "review" || a.source === "review"),
          )) ||
        (task.id === "quiz" &&
          passed.some((a) => a.kind === "question" || a.kind === "game")) ||
        (task.id === "challenge" && passed.some((a) => a.kind === "challenge")),
    })),
  };
  return state;
}

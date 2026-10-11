import { it, expect } from "vitest";
import {
  applyAssistance,
  preserveAssistantEdits,
  canonicalCourseUrl,
} from "../src/lib/learning-assistant";
import { emptyState, validateState, goalProgress } from "../src/lib/model";
import { emptyEducation, recordAttempt } from "../src/lib/education";
import { questions, lessons } from "../src/lib/academy-content";
const now = new Date("2026-10-11T12:00:00Z");
function assisted() {
  const state = emptyState();
  state.education = emptyEducation();
  state.education.assistant.enabled = true;
  return state;
}
it("adds an editable queue, direction, weekly goal and daily plan without claiming achievements", () => {
  const original = assisted(),
    state = applyAssistance(original, now);
  expect(state.education!.primary).toBe("software");
  expect(state.records.courses.length).toBeGreaterThan(0);
  expect(state.records.courses.length).toBeLessThanOrEqual(3);
  expect(state.records.goals).toHaveLength(1);
  expect(state.education!.plans["2026-10-11"]).toBeDefined();
  expect(state.records.certificates).toEqual([]);
  expect(state.education!.attempts).toEqual([]);
  expect(state.education!.xp).toEqual([]);
  expect(
    state.records.courses.every((c) => !c.enrollmentDate && !c.completionDate),
  ).toBe(true);
  expect(original.records.courses).toEqual([]);
  expect(() => validateState(state)).not.toThrow();
});
it("is idempotent and leaves disabled legacy workspaces untouched", () => {
  const legacy = emptyState();
  expect(applyAssistance(legacy, now)).toBe(legacy);
  const state = applyAssistance(assisted(), now);
  expect(applyAssistance(state, now)).toEqual(state);
});
it("preserves user edits and never re-adds a deleted recommendation", () => {
  const initial = applyAssistance(assisted(), now),
    removed = initial.records.courses[0];
  const updated = preserveAssistantEdits(
    {
      ...initial,
      records: {
        ...initial.records,
        courses: initial.records.courses.slice(1),
      },
    },
    initial,
  );
  const state = applyAssistance(updated, now);
  expect(
    state.records.courses.some(
      (c) =>
        canonicalCourseUrl(String(c.url)) ===
        canonicalCourseUrl(String(removed.url)),
    ),
  ).toBe(false);
  state.records.courses[0].title = "My edited title";
  state.records.goals[0].targetValue = 12;
  expect(applyAssistance(state, now).records.courses[0].title).toBe(
    "My edited title",
  );
  expect(applyAssistance(state, now).records.goals[0].targetValue).toBe(12);
});
it("preserves existing active courses and does not create provider enrollment", () => {
  const state = assisted();
  state.records.courses.push({
    id: "mine",
    title: "Existing course",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    status: "In Progress",
    url: "https://example.com/course",
  });
  const result = applyAssistance(state, now);
  expect(result.records.courses.find((c) => c.id === "mine")).toEqual(
    state.records.courses[0],
  );
  expect(
    result.records.courses
      .filter((c) => c.assistantManaged)
      .every((c) => c.status === "Planned"),
  ).toBe(true);
});
it("starts the next queued course after a completed course without inventing its completion", () => {
  const state = applyAssistance(assisted(), now),
    active = state.records.courses.find((c) => c.status === "In Progress")!;
  active.status = "Completed";
  active.completionDate = "2026-10-11";
  const result = applyAssistance(state, now);
  expect(
    result.records.courses.find((c) => c.id === active.id)?.completionDate,
  ).toBe("2026-10-11");
  expect(
    result.records.courses.some(
      (c) => c.id !== active.id && c.status === "In Progress",
    ),
  ).toBe(true);
});
it("records plan tasks from successful evaluated work and deduplicates weekly goals", () => {
  let state = applyAssistance(assisted(), now),
    e = state.education!;
  const lesson = lessons[0];
  e = recordAttempt(
    e,
    {
      unit: lesson.id,
      kind: "lesson",
      topic: lesson.topic,
      passed: true,
      score: 100,
      source: "academy",
    },
    state.profile.timezone,
    now,
  );
  e = recordAttempt(
    e,
    {
      unit: lesson.id,
      kind: "challenge",
      topic: lesson.topic,
      passed: true,
      score: 100,
      source: "academy",
    },
    state.profile.timezone,
    now,
  );
  const q = questions[0];
  e = recordAttempt(
    e,
    {
      unit: q.id,
      kind: "question",
      topic: q.topic,
      passed: true,
      score: 100,
      source: "quiz",
    },
    state.profile.timezone,
    now,
  );
  e = recordAttempt(
    e,
    {
      unit: q.id,
      kind: "game",
      topic: q.topic,
      passed: true,
      score: 100,
      source: "game",
    },
    state.profile.timezone,
    now,
  );
  state = applyAssistance({ ...state, education: e }, now);
  expect(goalProgress(state.records.goals[0], state)).toBe(2);
  expect(
    state.education!.plans["2026-10-11"].tasks.find((t) => t.id === "lesson")
      ?.done,
  ).toBe(true);
});
it("respects a removed generated goal and manual plan changes", () => {
  const first = applyAssistance(assisted(), now),
    updated = preserveAssistantEdits(
      { ...first, records: { ...first.records, goals: [] } },
      first,
    );
  updated.education!.plans["2026-10-11"] = { minutes: 15, tasks: [] };
  const result = applyAssistance(updated, now);
  expect(result.records.goals).toEqual([]);
  expect(result.education!.plans["2026-10-11"]).toEqual({
    minutes: 15,
    tasks: [],
  });
});

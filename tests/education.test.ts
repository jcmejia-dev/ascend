import { describe, it, expect } from "vitest";
import { emptyState, validateState } from "../src/lib/model";
import {
  emptyEducation,
  validateEducation,
  recordAttempt,
  mastery,
  roadmap,
  readiness,
  level,
  syncAwards,
  dailyPlan,
  dailyChallenge,
  streak,
} from "../src/lib/education";
import { lessons, questions, capstones } from "../src/lib/academy-content";
import { recommendResources } from "../src/lib/discovery";
const now = new Date("2026-10-11T04:00:00Z"),
  zone = "Asia/Singapore";
const pass = (
  unit: string,
  kind: "lesson" | "question" | "challenge" | "game" = "lesson",
  topic = unit,
) => ({ unit, kind, topic, passed: true, score: 100, source: "test" });
describe("additive education migration and evidence", () => {
  it("migrates v1 records idempotently without changing profile or credentials", () => {
    const old = emptyState();
    old.records.certificates.push({
      id: "credential",
      title: "Real credential",
      organization: "Issuer",
      issueDate: "2026-10-10",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    const migrated = validateState(old);
    expect(migrated.records).toEqual(old.records);
    expect(migrated.profile).toEqual(old.profile);
    expect(migrated.education).toEqual(emptyEducation());
    expect(validateState(migrated)).toEqual(migrated);
  });
  it("rejects duplicate XP keys and orphaned evidence/project references", () => {
    const e = recordAttempt(emptyEducation(), pass("variables"), zone, now);
    expect(() => validateEducation({ ...e, xp: [...e.xp, ...e.xp] })).toThrow(
      /Duplicate/,
    );
    expect(() =>
      validateEducation({
        ...e,
        attempts: [{ ...e.attempts[0], unit: "fake" }],
      }),
    ).toThrow(/reference/);
    expect(() => validateEducation({ ...e, primary: "no-track" })).toThrow(
      /career/,
    );
  });
  it("does not infer competence from self-reports, XP or plan overrides", () => {
    const e = emptyEducation();
    e.selfReported.React = "Experienced";
    e.overrides.async = "Mastered";
    expect(mastery(e, "React").mastered).toBe(false);
    expect(readiness(e).stage).toBe(0);
    expect(
      roadmap({ ...e, primary: "react" }).find((n) => n.id === "async")?.state,
    ).toBe("Mastered");
    expect(mastery(e, "async").mastered).toBe(false);
  });
  it("requires distinct evaluated activities and tracks repeated errors", () => {
    let e = recordAttempt(emptyEducation(), pass("variables"), zone, now);
    e = recordAttempt(e, pass("variables", "challenge"), zone, now);
    expect(mastery(e, "variables").mastered).toBe(false);
    e = recordAttempt(
      e,
      pass("js-binding", "question", "variables"),
      zone,
      now,
    );
    expect(mastery(e, "variables").mastered).toBe(true);
    for (let i = 0; i < 2; i++)
      e = recordAttempt(
        e,
        { ...pass("variables"), passed: false, score: 0 },
        zone,
        now,
      );
    expect(mastery(e, "variables").review).toBe(true);
    expect(mastery(e, "variables").mastered).toBe(false);
  });
  it("produces deterministic prerequisite guidance and keeps content explorable", () => {
    const e = { ...emptyEducation(), primary: "react" };
    expect(roadmap(e).find((n) => n.id === "async")?.reason).toContain(
      "promises",
    );
    expect(roadmap(e).find((n) => n.id === "variables")?.state).toBe(
      "Recommended",
    );
    expect(roadmap(e)).toEqual(roadmap(e));
  });
  it("awards once across retries and quiz/arcade, while retaining attempt history", () => {
    let e = recordAttempt(
      emptyEducation(),
      pass("js-binding", "question", "variables"),
      zone,
      now,
    );
    e = recordAttempt(e, pass("js-binding", "game", "variables"), zone, now);
    e = recordAttempt(
      e,
      pass("js-binding", "question", "variables"),
      zone,
      now,
    );
    expect(e.attempts).toHaveLength(3);
    expect(e.xp).toHaveLength(1);
    expect(level(e).xp).toBe(10);
  });
  it("failed attempts earn nothing; complete beginner path awards once", () => {
    let e = recordAttempt(
      emptyEducation(),
      { ...pass("variables"), passed: false, score: 0 },
      zone,
      now,
    );
    expect(e.xp).toHaveLength(0);
    for (const l of lessons.filter((l) => l.tier === "Beginner"))
      e = recordAttempt(e, pass(l.id), zone, now);
    expect(e.xp.reduce((s, x) => s + x.amount, 0)).toBe(235);
    e = recordAttempt(e, pass("variables"), zone, now);
    expect(e.xp.reduce((s, x) => s + x.amount, 0)).toBe(235);
  });
  it("reviews grow with success and reset to next day on error", () => {
    let e = recordAttempt(emptyEducation(), pass("variables"), zone, now);
    expect(e.reviews.variables.interval).toBe(2);
    e = recordAttempt(e, pass("variables"), zone, now);
    expect(e.reviews.variables.interval).toBe(4);
    e = recordAttempt(
      e,
      { ...pass("variables"), passed: false, score: 0 },
      zone,
      now,
    );
    expect(e.reviews.variables.due).toBe("2026-10-12");
    expect(e.reviews.variables.interval).toBe(1);
  });
  it("adapts daily challenges after demonstrated beginner success", () => {
    let e = emptyEducation();
    expect(dailyChallenge(e, "2026-10-11").tier).toBe("Beginner");
    for (const l of lessons.slice(0, 7))
      e = recordAttempt(e, pass(l.id), zone, now);
    expect(dailyChallenge(e, "2026-10-11").tier).toBe("Intermediate");
    for (let i = 0; i < 2; i++)
      e = recordAttempt(
        e,
        { ...pass("async"), passed: false, score: 0 },
        zone,
        now,
      );
    expect(dailyChallenge(e, "2026-10-11").id).toBe("async");
  });
  it("plans fit the time budget, preserve edits, and prioritize a gap", () => {
    let e = emptyEducation();
    for (let i = 0; i < 2; i++)
      e = recordAttempt(
        e,
        { ...pass("variables"), passed: false, score: 0 },
        zone,
        now,
      );
    const state = { ...emptyState(), education: e };
    const plan = dailyPlan(state, "2026-10-11", 25);
    expect(plan.tasks[0].id).toBe("review");
    expect(plan.tasks.reduce((s, t) => s + t.minutes, 0)).toBeLessThanOrEqual(
      25,
    );
    e.plans["2026-10-11"] = { minutes: 5, tasks: [] };
    expect(dailyPlan(state, "2026-10-11").minutes).toBe(5);
  });
  it("unlocks real badges idempotently and excludes pending credentials", () => {
    const state = emptyState();
    state.education = recordAttempt(
      emptyEducation(),
      pass("variables"),
      zone,
      now,
    );
    let next = syncAwards(state);
    expect(next.education?.awards.map((a) => a.id)).toContain("first");
    expect(syncAwards(next)).toEqual(next);
    next.records.certificates.push({
      id: "cert",
      title: "Credential",
      organization: "Issuer",
      issueDate: "2026-10-10",
      pendingVerification: true,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    expect(
      syncAwards(next).education?.awards.some((a) => a.id === "credential"),
    ).toBe(false);
  });
  it("counts consecutive learning days without deleting progress after a gap", () => {
    let e = emptyEducation();
    for (let day = 1; day <= 7; day++)
      e = recordAttempt(
        e,
        pass("variables"),
        zone,
        new Date(`2026-10-0${day}T04:00:00Z`),
      );
    expect(streak(e, "2026-10-07")).toEqual({ current: 7, longest: 7 });
    expect(streak(e, "2026-10-11")).toEqual({ current: 0, longest: 7 });
    expect(e.xp).toHaveLength(1);
  });
  it("adjusts recommendations to goals and linked course history", () => {
    const state = emptyState();
    state.education = {
      ...emptyEducation(),
      primary: "laravel",
      preferred: "Laravel",
    };
    expect(recommendResources(state)[0].id).toBe("laravel-docs");
    expect(
      recommendResources(state).find((r) => r.id === "catalog-7")?.personal,
    ).toContain("Select a specific course");
  });
  it("has substantive curriculum, valid prerequisites and unique content IDs", () => {
    expect(lessons).toHaveLength(25);
    expect(new Set(lessons.map((l) => l.id)).size).toBe(25);
    for (const l of lessons) {
      expect(l.explanation.length).toBeGreaterThan(100);
      expect(l.cases.length).toBeGreaterThanOrEqual(3);
      expect(l.hints).toHaveLength(3);
      for (const p of l.prerequisites)
        expect(lessons.some((n) => n.id === p)).toBe(true);
    }
    expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
    for (const p of capstones) expect(p.criteria.length).toBeGreaterThan(2);
  });
});
describe("authored reference solution correctness", () => {
  for (const l of lessons)
    it(`${l.title} passes all reviewed fixtures`, async () => {
      const solve = Function(`${l.solution}; return solve;`)();
      for (const c of l.cases) {
        const args = structuredClone(c.args),
          before = structuredClone(args);
        expect(await solve(...args)).toEqual(c.expected);
        if (c.unchanged) expect(args).toEqual(before);
      }
    });
});

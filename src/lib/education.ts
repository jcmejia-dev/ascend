import { z } from "zod";
import { assistantSchema, emptyAssistant } from "./assistant-schema";
import {
  lessons,
  questions,
  tracks,
  capstones,
  interviews,
  BANK_VERSION,
} from "./academy-content";
import type { State } from "./model";
import { dateKey } from "./dates";
const text = z.string().max(10000);
const attemptSchema = z.object({
  id: z.string(),
  unit: z.string(),
  kind: z.enum([
    "lesson",
    "question",
    "assessment",
    "challenge",
    "game",
    "interview",
  ]),
  topic: z.string(),
  passed: z.boolean(),
  score: z.number().min(0).max(100),
  at: z.iso.datetime(),
  day: z.string(),
  source: z.string(),
  answer: text.optional(),
  results: z
    .array(
      z.object({
        label: z.string(),
        passed: z.boolean(),
        actual: text.optional(),
      }),
    )
    .max(100)
    .optional(),
  elapsed: z.number().nonnegative().optional(),
});
export type Attempt = z.infer<typeof attemptSchema>;
const trackSchema = z.object({
  id: z.string(),
  title: text,
  overview: text,
  technologies: text,
  topics: z.array(z.string()).max(50),
  responsibilities: text,
  prerequisites: text,
  milestones: text,
  projects: text,
  assessments: text,
  courses: text,
  certifications: text,
  effort: text,
  preparation: text,
});
export type CareerTrack = z.infer<typeof trackSchema>;
export const educationSchema = z.object({
  assistant: assistantSchema,
  version: z.literal(1),
  primary: z.string(),
  secondary: z.array(z.string()).max(20),
  customTracks: z.array(trackSchema).max(50),
  selfReported: z.record(
    z.string(),
    z.enum(["New", "Some practice", "Experienced"]),
  ),
  budget: z.enum(["Free", "Any"]),
  preferred: text,
  attempts: z.array(attemptSchema).max(50000),
  drafts: z.record(z.string(), z.string().max(30000)),
  xp: z
    .array(
      z.object({
        key: z.string(),
        amount: z.number().int().min(0).max(10000),
        at: z.iso.datetime(),
        label: text,
      }),
    )
    .max(50000),
  weights: z.object({
    lesson: z.number().int().min(0).max(500),
    quiz: z.number().int().min(0).max(500),
    challenge: z.number().int().min(0).max(500),
    assessment: z.number().int().min(0).max(500),
    path: z.number().int().min(0).max(500),
  }),
  awards: z.array(z.object({ id: z.string(), at: z.iso.datetime() })).max(100),
  reviews: z.record(
    z.string(),
    z.object({
      due: z.string(),
      interval: z.number().int().min(1).max(90),
      successes: z.number().int().nonnegative(),
    }),
  ),
  plans: z.record(
    z.string(),
    z.object({
      minutes: z.number().int().min(5).max(240),
      tasks: z
        .array(
          z.object({
            id: z.string(),
            title: text,
            minutes: z.number().int().min(1).max(240),
            destination: text,
            done: z.boolean(),
          }),
        )
        .max(20),
    }),
  ),
  submissions: z
    .array(
      z.object({
        id: z.string(),
        project: z.string(),
        url: z.string().url(),
        notes: text,
        criteria: z.array(z.string()).max(30),
        tests: z.array(z.string()).max(30),
        documentation: z.array(z.string()).max(30),
        assistance: z.enum([
          "None",
          "Hints / review",
          "Generated implementation",
        ]),
        at: z.iso.datetime(),
      }),
    )
    .max(1000),
  savedCatalog: z.array(z.string()).max(100),
  overrides: z.record(
    z.string(),
    z.enum([
      "Not Started",
      "Recommended",
      "In Progress",
      "Review Needed",
      "Mastered",
      "Completed",
      "Optional",
    ]),
  ),
});
export type Education = z.infer<typeof educationSchema>;
export function emptyEducation(): Education {
  return {
    assistant: emptyAssistant(),
    version: 1,
    primary: "",
    secondary: [],
    customTracks: [],
    selfReported: {},
    budget: "Free",
    preferred: "",
    attempts: [],
    drafts: {},
    xp: [],
    weights: { lesson: 15, quiz: 10, challenge: 25, assessment: 50, path: 100 },
    awards: [],
    reviews: {},
    plans: {},
    submissions: [],
    savedCatalog: [],
    overrides: {},
  };
}
export function validateEducation(input: unknown): Education {
  const e = educationSchema.parse(input ?? emptyEducation());
  for (const [items, key] of [
    [e.attempts, "id"],
    [e.xp, "key"],
    [e.awards, "id"],
    [e.submissions, "id"],
    [e.customTracks, "id"],
  ] as const) {
    const ids = items.map((item) =>
      String((item as unknown as Record<string, unknown>)[key]),
    );
    if (new Set(ids).size !== ids.length)
      throw Error("Duplicate education evidence or reward ID.");
  }
  const pathIds = new Set([
    ...tracks.map((t) => t.id),
    ...e.customTracks.map((t) => t.id),
  ]);
  if (e.primary && !pathIds.has(e.primary))
    throw Error("Unknown primary career path.");
  if (e.secondary.some((id) => !pathIds.has(id)))
    throw Error("Unknown secondary career path.");
  const unitIds = new Set([
    ...lessons.map((l) => l.id),
    ...questions.map((q) => q.id),
    ...interviews.map((i) => i.id),
    "diagnostic",
    "git-assessment",
    "capstone-calculator",
  ]);
  if (e.attempts.some((a) => !unitIds.has(a.unit)))
    throw Error("Unknown learning evidence reference.");
  for (const reward of e.xp) {
    const parts = reward.key.split(":"),
      kind = parts[1],
      unit = parts[2];
    if (
      parts.length !== 3 ||
      !["lesson", "quiz", "challenge", "assessment", "path"].includes(kind)
    )
      throw Error("Invalid XP award reference.");
    const supported =
      kind === "path"
        ? unit === "beginner" &&
          lessons
            .filter((l) => l.tier === "Beginner")
            .every((l) =>
              e.attempts.some(
                (a) => a.kind === "lesson" && a.unit === l.id && a.passed,
              ),
            )
        : e.attempts.some(
            (a) =>
              a.passed &&
              a.unit === unit &&
              (kind === "quiz"
                ? ["question", "game"].includes(a.kind)
                : a.kind === kind),
          );
    if (!supported)
      throw Error("XP requires corresponding successful learning evidence.");
  }
  if (
    e.awards.some(
      (a) =>
        ![
          "first",
          "bugs",
          "explorer",
          "consistent",
          "builder",
          "sql",
          "git",
          "credential",
          "portfolio",
          "century",
        ].includes(a.id),
    )
  )
    throw Error("Unknown achievement reference.");
  for (const a of e.attempts) {
    const lesson = lessons.find((l) => l.id === a.unit),
      question = questions.find((q) => q.id === a.unit);
    if (
      (a.kind === "lesson" || a.kind === "challenge") &&
      (!lesson || a.topic !== lesson.topic)
    )
      throw Error("Invalid lesson evidence relationship.");
    if (
      (a.kind === "question" || a.kind === "game") &&
      (!question || a.topic !== question.topic)
    )
      throw Error("Invalid question evidence relationship.");
    if (
      a.kind === "assessment" &&
      !["diagnostic", "git-assessment", "capstone-calculator"].includes(a.unit)
    )
      throw Error("Invalid assessment reference.");
    if (a.kind === "interview" && !interviews.some((i) => i.id === a.unit))
      throw Error("Invalid interview reference.");
  }
  if (
    Object.keys(e.drafts).some((id) => !lessons.some((l) => l.id === id)) ||
    Object.keys(e.reviews).some((id) => !unitIds.has(id))
  )
    throw Error("Unknown draft or review reference.");
  for (const submission of e.submissions) {
    const p = capstones.find((p) => p.id === submission.project);
    if (
      p &&
      (submission.criteria.some((c) => !p.criteria.includes(c)) ||
        submission.tests.some((c) => !p.tests.includes(c)) ||
        submission.documentation.some((c) => !p.docs.includes(c)))
    )
      throw Error("Invalid project checklist relationship.");
  }
  if (
    e.submissions.some(
      (s) =>
        !capstones.some((p) => p.id === s.project) ||
        !/^https:\/\//.test(s.url),
    )
  )
    throw Error("Invalid project reference or repository URL.");
  return e;
}
export function allTracks(e: Education): CareerTrack[] {
  const roleDetails: Record<
    string,
    { responsibilities: string; projects: string[]; prerequisites: string }
  > = {
    software: {
      responsibilities:
        "Translate requirements into small modules, choose data structures, diagnose defects, review changes and write regression tests.",
      projects: ["todo", "expense", "rest-api"],
      prerequisites:
        "Programming fundamentals and basic command-line use; demonstrate prior knowledge with the diagnostic.",
    },
    frontend: {
      responsibilities:
        "Build accessible responsive interfaces, model UI state, integrate HTTP data and test keyboard and error workflows.",
      projects: ["todo", "weather", "react-api"],
      prerequisites:
        "HTML/CSS and JavaScript functions, arrays and asynchronous programming before React.",
    },
    backend: {
      responsibilities:
        "Model relational data, design API contracts, enforce authorization, use transactions and test server failure cases.",
      projects: ["rest-api", "auth", "inventory"],
      prerequisites:
        "Programming functions and error handling, SQL basics and HTTP concepts.",
    },
    fullstack: {
      responsibilities:
        "Connect client state to an authorized API, design data boundaries, diagnose cross-layer failures and automate tests.",
      projects: ["expense", "fullstack", "react-api"],
      prerequisites:
        "JavaScript fundamentals, SQL and one backend language. Existing PHP knowledge can be demonstrated rather than repeated.",
    },
    laravel: {
      responsibilities:
        "Implement Laravel routes and services, validate requests, enforce policies, manage migrations and write feature tests.",
      projects: ["rest-api", "auth", "inventory"],
      prerequisites:
        "PHP functions and objects, SQL and HTTP before framework-specific work.",
    },
    react: {
      responsibilities:
        "Design component boundaries, model state, handle effects and stale requests, add runtime validation and test user behavior.",
      projects: ["todo", "weather", "react-api"],
      prerequisites:
        "JavaScript functions, arrays, objects and promises before React and TypeScript.",
    },
    ai: {
      responsibilities:
        "Build bounded model integrations, evaluate outputs, protect private data, constrain tools and handle model/API failures.",
      projects: ["weather", "react-api", "delivery"],
      prerequisites:
        "Asynchronous programming, HTTP APIs, security boundaries and reproducible evaluation.",
    },
    automation: {
      responsibilities:
        "Map repeatable workflows, make writes idempotent, bound retries, protect credentials and record observable failures.",
      projects: ["rest-api", "expense", "delivery"],
      prerequisites:
        "Conditions, loops, API requests, Git and secret management.",
    },
    devops: {
      responsibilities:
        "Create reproducible builds, maintain least-privilege delivery pipelines, configure environments and document health checks and rollback.",
      projects: ["delivery", "rest-api", "fullstack"],
      prerequisites:
        "Git, a local command line, tests, environment configuration and security fundamentals.",
    },
  };
  const defaults = tracks.map((t) => ({
    ...t,
    responsibilities:
      roleDetails[t.id]?.responsibilities ??
      "Define your responsibilities and competencies, then choose exercises and work evidence that demonstrate them.",
    prerequisites:
      roleDetails[t.id]?.prerequisites ??
      "Choose prerequisite knowledge for your custom goal.",
    milestones: t.topics.join(" → "),
    projects: capstones
      .filter((p) => roleDetails[t.id]?.projects.includes(p.id) ?? true)
      .slice(0, 3)
      .map((p) => p.title)
      .join(", "),
    assessments:
      "Initial diagnostic; topic checkpoints; evaluated JavaScript solutions; project evidence; interview reflection.",
    courses:
      "Choose verified resources in Discover Courses matched to competencies.",
    certifications:
      "Optional external credentials only; consult provider requirements and costs.",
    effort:
      "Personal estimate: 80–200 focused hours, adjusted to prior demonstrated knowledge; not a provider duration.",
    preparation:
      "Document decisions and tests in a portfolio. Practice explaining failures, collaboration and tradeoffs. This path does not guarantee employment.",
  }));
  return [
    ...defaults.filter((t) => !e.customTracks.some((c) => c.id === t.id)),
    ...e.customTracks,
  ];
}
export function mastery(e: Education, topic: string) {
  const evidence = e.attempts.filter(
      (a) =>
        a.topic === topic && a.kind !== "interview" && a.kind !== "assessment",
    ),
    recent = evidence.slice(-5);
  const unique = new Set(evidence.filter((a) => a.passed).map((a) => a.unit));
  const failed = recent.filter((a) => !a.passed).length;
  const mastered =
    failed < 2 &&
    unique.size >= 2 &&
    recent.filter((a) => a.passed).length / Math.max(1, recent.length) >= 0.8;
  return {
    evidence,
    recent,
    unique: unique.size,
    accuracy: recent.length
      ? Math.round(
          (recent.filter((a) => a.passed).length / recent.length) * 100,
        )
      : 0,
    mastered,
    review: failed >= 2,
    status:
      failed >= 2
        ? "Review Needed"
        : mastered
          ? "Mastered"
          : evidence.length
            ? "In Progress"
            : "Not Started",
  };
}
export function roadmap(e: Education) {
  const track = allTracks(e).find((t) => t.id === e.primary) ?? allTracks(e)[0];
  const topics = [
    ...new Set([
      ...track.topics,
      ...allTracks(e)
        .filter((t) => e.secondary.includes(t.id))
        .flatMap((t) => t.topics),
    ]),
  ];
  const required = new Set(topics);
  const add = (id: string) => {
    const l = lessons.find((l) => l.id === id);
    l?.prerequisites.forEach((p) => {
      if (!required.has(p)) {
        required.add(p);
        add(p);
      }
    });
  };
  topics.forEach(add);
  return [
    ...lessons
      .filter((l) => required.has(l.id))
      .map((l) => ({
        id: l.id,
        title: l.title,
        prerequisites: l.prerequisites,
        minutes: l.minutes,
      })),
    ...topics
      .filter((t) => !lessons.some((l) => l.id === t))
      .map((t) => ({
        id: t,
        title: t,
        prerequisites:
          t === "React"
            ? ["async", "functions"]
            : t === "Laravel"
              ? ["PHP", "SQL"]
              : t === "GitHub Actions"
                ? ["Git"]
                : [],
        minutes: 60,
      })),
  ].map((node) => {
    const m = mastery(e, node.id),
      gaps = node.prerequisites.filter((p) => !mastery(e, p).mastered);
    const state =
      e.overrides[node.id] ??
      (m.review
        ? "Review Needed"
        : m.mastered
          ? "Mastered"
          : m.evidence.length
            ? "In Progress"
            : gaps.length
              ? "Not Started"
              : "Recommended");
    return {
      ...node,
      state,
      evidence: m.unique,
      reason: e.overrides[node.id]
        ? "You selected a planning override. Demonstrated competence remains based on evidence."
        : m.review
          ? "At least two of the last five attempts were incorrect. Review this concept and its prerequisites."
          : m.mastered
            ? "Two distinct evaluated activities and at least 80% accuracy across recent attempts support this checkpoint."
            : gaps.length
              ? `Recommended prerequisites first: ${gaps.join(", ")}. You may explore this topic anytime.`
              : `Supports ${track.title}; no unmet prerequisites in the reviewed graph.`,
      alternative:
        "Use the academy, an official learning resource, or demonstrate existing knowledge through a diagnostic.",
    };
  });
}
export function recordAttempt(
  e: Education,
  a: Omit<Attempt, "id" | "at" | "day">,
  timezone: string,
  now = new Date(),
): Education {
  const next: Education = structuredClone(e);
  const at = now.toISOString();
  next.attempts.push({
    ...a,
    id: crypto.randomUUID(),
    at,
    day: dateKey(now, timezone),
  });
  const review = next.reviews[a.unit];
  const interval = a.passed ? Math.min(90, (review?.interval ?? 1) * 2) : 1;
  next.reviews[a.unit] = {
    due: dateKey(new Date(now.getTime() + interval * 86400000), timezone),
    interval,
    successes: a.passed ? (review?.successes ?? 0) + 1 : 0,
  };
  if (a.passed) {
    const kind =
      a.kind === "question" || a.kind === "game"
        ? "quiz"
        : a.kind === "interview"
          ? null
          : a.kind;
    if (kind) {
      const key = `${BANK_VERSION}:${kind}:${a.unit}`;
      if (!next.xp.some((x) => x.key === key))
        next.xp.push({
          key,
          amount: next.weights[kind],
          at,
          label: `${kind}: ${a.unit}`,
        });
    }
  }
  if (
    lessons
      .filter((l) => l.tier === "Beginner")
      .every((l) =>
        next.attempts.some(
          (a) => a.kind === "lesson" && a.unit === l.id && a.passed,
        ),
      )
  ) {
    const key = `${BANK_VERSION}:path:beginner`;
    if (!next.xp.some((x) => x.key === key))
      next.xp.push({
        key,
        amount: next.weights.path,
        at,
        label: "JavaScript beginner path",
      });
  }
  return next;
}
export function level(e: Education) {
  const xp = e.xp.reduce((s, x) => s + x.amount, 0);
  let n = 1,
    base = 0;
  while (xp >= base + 100 * n) {
    base += 100 * n;
    n++;
  }
  return {
    level: n,
    xp,
    base,
    next: base + 100 * n,
    progress: Math.round(((xp - base) / (100 * n)) * 100),
  };
}
export function streak(e: Education, today: string) {
  const days = new Set(
    e.attempts
      .filter((a) => a.passed && a.kind !== "assessment")
      .map((a) => a.day),
  );
  let longest = 0;
  for (const d of days) {
    let count = 0,
      date = new Date(`${d}T12:00:00Z`);
    while (days.has(date.toISOString().slice(0, 10))) {
      count++;
      date.setUTCDate(date.getUTCDate() - 1);
    }
    longest = Math.max(longest, count);
  }
  let current = 0,
    date = new Date(`${today}T12:00:00Z`);
  if (!days.has(today)) date.setUTCDate(date.getUTCDate() - 1);
  while (days.has(date.toISOString().slice(0, 10))) {
    current++;
    date.setUTCDate(date.getUTCDate() - 1);
  }
  return { current, longest };
}
export function achievements(state: State) {
  const e = state.education ?? emptyEducation(),
    passes = e.attempts.filter((a) => a.passed),
    unique = (kind: string, topic?: string) =>
      new Set(
        passes
          .filter((a) => a.kind === kind && (!topic || a.topic === topic))
          .map((a) => a.unit),
      ).size;
  const projects = e.submissions.filter((s) => {
    const p = capstones.find((p) => p.id === s.project)!;
    return (
      p.criteria.every((c) => s.criteria.includes(c)) &&
      p.tests.every((c) => s.tests.includes(c)) &&
      p.docs.every((c) => s.documentation.includes(c))
    );
  });
  return [
    {
      id: "first",
      title: "First Steps",
      description: "Complete a coding lesson and its checkpoint.",
      value: unique("lesson"),
      target: 1,
    },
    {
      id: "bugs",
      title: "Bug Hunter",
      description: "Solve 10 distinct debugging activities.",
      value: new Set(
        passes
          .filter(
            (a) =>
              questions.find((q) => q.id === a.unit)?.format ===
                "Identify the bug" || a.topic === "debugging",
          )
          .map((a) => a.unit),
      ).size,
      target: 10,
    },
    {
      id: "explorer",
      title: "JavaScript Explorer",
      description: "Complete all nine beginner lessons.",
      value: lessons.filter(
        (l) =>
          l.tier === "Beginner" &&
          passes.some((a) => a.kind === "lesson" && a.unit === l.id),
      ).length,
      target: 9,
    },
    {
      id: "consistent",
      title: "Consistent Learner",
      description:
        "Evaluated learning on seven consecutive days; no penalty for a break.",
      value: streak(e, dateKey(new Date(), state.profile.timezone)).longest,
      target: 7,
    },
    {
      id: "builder",
      title: "Independent Builder",
      description:
        "Submit a complete project with no generated implementation (self-reported, not independently verified).",
      value: projects.filter((p) => p.assistance === "None").length,
      target: 1,
    },
    {
      id: "sql",
      title: "Database Detective",
      description: "Pass three distinct SQL knowledge exercises.",
      value: new Set(passes.filter((a) => a.topic === "SQL").map((a) => a.unit))
        .size,
      target: 3,
    },
    {
      id: "git",
      title: "Git Guardian",
      description: "Pass the two-question Git assessment.",
      value: passes.some((a) => a.unit === "git-assessment") ? 1 : 0,
      target: 1,
    },
    {
      id: "credential",
      title: "First Credential",
      description: "Record an earned external certificate in the vault.",
      value: state.records.certificates.filter(
        (c) => c.issueDate && !c.pendingVerification,
      ).length,
      target: 1,
    },
    {
      id: "portfolio",
      title: "Portfolio Builder",
      description:
        "Submit a project with every acceptance, test and documentation item declared complete.",
      value: projects.length,
      target: 1,
    },
    {
      id: "century",
      title: "Century Club",
      description:
        "Pass 100 distinct coding challenges. The reviewed bank will expand over time.",
      value: unique("challenge"),
      target: 100,
    },
  ];
}
export function syncAwards(state: State): State {
  const e = structuredClone(state.education ?? emptyEducation());
  for (const badge of achievements({ ...state, education: e }))
    if (badge.value >= badge.target && !e.awards.some((a) => a.id === badge.id))
      e.awards.push({ id: badge.id, at: new Date().toISOString() });
  return { ...state, education: e };
}
export function dailyQuestion(e: Education, day: string) {
  const due = questions
    .filter((q) => e.reviews[q.id]?.due <= day)
    .sort((a, b) =>
      (e.reviews[a.id]?.due ?? "").localeCompare(e.reviews[b.id]?.due ?? ""),
    );
  const unseen = questions.filter(
    (q) => !e.attempts.some((a) => a.unit === q.id),
  );
  const bank = due.length ? due : unseen.length ? unseen : questions;
  const seed = Array.from(day).reduce((s, c) => s + c.charCodeAt(0), 0);
  return bank[seed % bank.length];
}
export function dailyChallenge(e: Education, day: string) {
  const success = new Set(
    e.attempts
      .filter(
        (a) =>
          a.kind === "lesson" &&
          a.passed &&
          lessons.find((l) => l.id === a.unit)?.tier === "Beginner",
      )
      .map((a) => a.unit),
  ).size;
  const intermediate = new Set(
    e.attempts
      .filter(
        (a) =>
          a.kind === "lesson" &&
          a.passed &&
          lessons.find((l) => l.id === a.unit)?.tier === "Intermediate",
      )
      .map((a) => a.unit),
  ).size;
  const demonstrated = lessons.filter((l) => mastery(e, l.id).mastered).length;
  const tier =
    intermediate >= 7 || demonstrated >= 15
      ? "Advanced"
      : success >= 7 || demonstrated >= 7
        ? "Intermediate"
        : "Beginner";
  const review = lessons.find((l) => mastery(e, l.id).review);
  const bank = review ? [review] : lessons.filter((l) => l.tier === tier);
  const seed = Array.from(day).reduce((s, c) => s + c.charCodeAt(0), 0);
  return bank[seed % bank.length];
}
export function readiness(e: Education) {
  const competencies = [
    ...new Set([...lessons.map((l) => l.id), ...questions.map((q) => q.topic)]),
  ];
  const goal = allTracks(e).find((t) => t.id === e.primary);
  const goalReady =
    !!goal && goal.topics.every((topic) => mastery(e, topic).mastered);
  const mastered = competencies.filter(
      (topic) => mastery(e, topic).mastered,
    ).length,
    completed = new Set(
      e.attempts
        .filter((a) => a.kind === "lesson" && a.passed)
        .map((a) => a.unit),
    ).size,
    challenge = new Set(
      e.attempts
        .filter((a) => a.kind === "challenge" && a.passed)
        .map((a) => a.unit),
    ).size,
    assessment = e.attempts.some((a) => a.kind === "assessment" && a.passed),
    reviews = e.attempts.some((a) => a.source === "review" && a.passed),
    project = e.submissions.some((s) => {
      const p = capstones.find((p) => p.id === s.project);
      return (
        p &&
        p.criteria.every((c) => s.criteria.includes(c)) &&
        p.tests.every((c) => s.tests.includes(c)) &&
        p.docs.every((c) => s.documentation.includes(c))
      );
    });
  const criteria = [
    true,
    e.attempts.length > 0,
    (completed >= 3 || mastered >= 3) && mastered >= 2,
    (completed >= 9 || mastered >= 9) && challenge >= 3 && assessment,
    mastered >= 12 && reviews && assessment && goalReady,
    mastered >= 18 && project && assessment && goalReady,
  ];
  let stage = 0;
  while (stage < 5 && criteria[stage + 1]) stage++;
  return {
    stage,
    title: [
      "Exploring",
      "Learning Fundamentals",
      "Building Confidence",
      "Applying Skills",
      "Capstone Ready",
      "Interview Practice Ready",
    ][stage],
    mastered,
    completed,
    challenge,
    assessment,
    reviews,
    project,
    goalReady,
    criteria: [
      "Explore a career and take the diagnostic",
      "Submit one evaluated learning activity",
      "Complete 3 lessons and demonstrate 2 topics, or demonstrate 3 topics",
      "Complete 9 lessons (or demonstrate 9 topics), 3 challenges and pass an assessment",
      "Demonstrate 12 topics including your career competencies; pass a scheduled review and assessment",
      "Demonstrate 18 topics including your career competencies; pass an assessment and submit a fully documented project",
    ],
    next:
      stage < 2
        ? "Take a diagnostic or continue fundamentals"
        : stage < 4
          ? "Practice the next prerequisite and a scheduled review"
          : "Document a capstone and practice explaining its design",
  };
}
export function dailyPlan(
  state: State,
  day: string,
  minutes = Math.min(
    120,
    Math.max(15, Math.round((state.profile.weeklyHours * 60) / 7)),
  ),
) {
  const e = state.education ?? emptyEducation();
  if (e.plans[day]) return e.plans[day];
  const tasks: Education["plans"][string]["tasks"] = [],
    nodes = roadmap(e),
    review =
      nodes.find((n) => n.state === "Review Needed") ??
      nodes.find((n) => e.reviews[n.id]?.due <= day),
    next = nodes.find(
      (n) => n.state === "Recommended" || n.state === "In Progress",
    );
  let left = minutes;
  const add = (
    id: string,
    title: string,
    time: number,
    destination: string,
  ) => {
    if (left < 5) return;
    const allotted = Math.min(time, left);
    tasks.push({ id, title, minutes: allotted, destination, done: false });
    left -= allotted;
  };
  if (review)
    add(
      "review",
      `Review ${review.title}: recent errors or a scheduled checkpoint`,
      15,
      "Coding Academy",
    );
  const deadline = [...state.records.courses, ...state.records.goals]
    .filter(
      (r) =>
        (r.dueDate || r.targetDate) &&
        String(r.dueDate || r.targetDate) >= day &&
        r.status !== "Completed",
    )
    .sort((a, b) =>
      String(a.dueDate || a.targetDate).localeCompare(
        String(b.dueDate || b.targetDate),
      ),
    )[0];
  if (deadline)
    add(
      "deadline",
      `Work toward ${deadline.title} · due ${deadline.dueDate || deadline.targetDate}`,
      20,
      "My Learning",
    );
  if (next)
    add(
      "lesson",
      `Learn ${next.title} for your career path`,
      20,
      lessons.some((l) => l.id === next.id)
        ? "Coding Academy"
        : "Discover Courses",
    );
  add(
    "quiz",
    "Take a knowledge check (due reviews first)",
    10,
    "Daily Challenge",
  );
  const course =
    state.records.courses.find(
      (c) => c.status === "In Progress" && c.assistantTrack === e.primary,
    ) ?? state.records.courses.find((c) => c.status === "In Progress");
  if (course) add("course", `Continue ${course.title}`, 30, "My Learning");
  if (left >= 5)
    add(
      "challenge",
      "Try today's evaluated coding challenge",
      20,
      "Daily Challenge",
    );
  return { minutes, tasks };
}

import { z } from "zod";
import {
  educationSchema,
  emptyEducation,
  validateEducation,
  type Education,
} from "./education";
export const VERSION = "2.0.0";
export type Kind =
  | "courses"
  | "certificates"
  | "practice"
  | "projects"
  | "goals"
  | "sessions"
  | "paths"
  | "milestones"
  | "skills"
  | "career"
  | "reminders";
export type RecordItem = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: string | number | boolean | undefined;
};
export type Timer = {
  status: "running" | "paused";
  startedAt: number | null;
  seconds: number;
  duration: number;
  mode: "Focus" | "Pomodoro" | "Break";
  courseId: string;
  skill: string;
  owner: string;
};
export type Profile = {
  name: string;
  title: string;
  careerGoals: string;
  learningHours: string;
  timezone: string;
  theme: "dark" | "light" | "system";
  weeklyHours: number;
  role: string;
  notifications: boolean;
  avatar: string;
};
export type State = {
  education?: Education;
  schema: 1;
  revision: number;
  profile: Profile;
  records: Record<Kind, RecordItem[]>;
  timer: Timer | null;
};
export const kinds: Kind[] = [
  "courses",
  "certificates",
  "practice",
  "projects",
  "goals",
  "sessions",
  "paths",
  "milestones",
  "skills",
  "career",
  "reminders",
];
export const skills = [
  "JavaScript",
  "TypeScript",
  "PHP",
  "Laravel",
  "React",
  "Next.js",
  "SQL",
  "Git",
  "GitHub Actions",
  "LLM Integration",
  "MCP",
  "Automation",
];
export const roadmapDefaults: Record<string, string[]> = {
  "JavaScript Foundations": [
    "Variables and data types",
    "Conditions",
    "Loops",
    "Functions",
    "Arrays and objects",
    "Asynchronous JavaScript",
    "Promises",
    "Error handling",
    "Algorithms",
  ],
  "Frontend Development": [
    "HTML",
    "CSS",
    "Responsive layouts",
    "Accessibility",
    "JavaScript DOM",
    "React",
    "State management",
    "Next.js",
    "Frontend testing",
  ],
  "Backend Development": [
    "PHP",
    "Laravel",
    "REST APIs",
    "Authentication",
    "Authorization",
    "SQL",
    "Database design",
    "Testing",
    "Deployment",
  ],
  "AI Integration & Automation": [
    "LLM fundamentals",
    "API integration",
    "Prompt engineering",
    "Context engineering",
    "MCP",
    "Tool calling",
    "n8n",
    "Power Automate",
    "AI workflow evaluation",
  ],
  "DevOps Foundations": [
    "Git",
    "GitHub",
    "Branching",
    "Pull requests",
    "YAML",
    "GitHub Actions",
    "CI/CD",
    "Environment variables",
    "Deployment",
  ],
};
export const dateKey = (date = new Date(), timezone = "Asia/Manila") =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
export function emptyState(): State {
  const now = new Date().toISOString();
  const records = Object.fromEntries(
    kinds.map((k) => [k, []]),
  ) as unknown as State["records"];
  Object.entries(roadmapDefaults).forEach(([title, topics], i) => {
    const id = `path-${i}`;
    records.paths.push({
      id,
      title,
      createdAt: now,
      updatedAt: now,
      description: "A suggested path. Adapt it to your goals.",
    });
    topics.forEach((topic, j) =>
      records.milestones.push({
        id: `milestone-${i}-${j}`,
        title: topic,
        pathId: id,
        status: "Not Started",
        createdAt: now,
        updatedAt: now,
      }),
    );
  });
  records.skills = skills.map((title, i) => ({
    id: `skill-${i}`,
    title,
    confidence: "Exploring",
    createdAt: now,
    updatedAt: now,
  }));
  return {
    schema: 1,
    revision: 0,
    profile: {
      name: "Jamie",
      title: "Aspiring full-stack developer",
      careerGoals:
        "Build independent programming ability and a credible portfolio.",
      learningHours: "Evenings",
      timezone: "Asia/Manila",
      theme: "dark",
      weeklyHours: 10,
      role: "Junior Full-Stack Developer",
      notifications: false,
      avatar: "",
    },
    records,
    timer: null,
  };
}
export function progress(course: RecordItem) {
  const total = Number(course.totalLessons || 0);
  return Math.round(
    Math.min(
      100,
      Math.max(
        0,
        total > 0
          ? (Number(course.completedLessons || 0) / total) * 100
          : Number(course.manualProgress || 0),
      ),
    ),
  );
}
export function certificateStatus(c: RecordItem, today = dateKey()): string {
  if (c.expirationDate && String(c.expirationDate) < today) return "Expired";
  if (c.expirationDate && String(c.expirationDate) <= addDays(today, 30))
    return "Expiring Soon";
  return c.pendingVerification ? "Pending Verification" : "Earned";
}
export function addDays(day: string, n: number) {
  const d = new Date(day + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function weekStart(day: string) {
  const d = new Date(day + "T12:00:00Z");
  return addDays(day, -((d.getUTCDay() + 6) % 7));
}
export function hours(list: RecordItem[]) {
  return list.reduce((n, r) => n + Number(r.minutes || 0), 0) / 60;
}
export function studyStreak(
  state: State,
  today = dateKey(new Date(), state.profile.timezone),
) {
  const days = new Set(
    [...state.records.sessions, ...state.records.practice]
      .filter((r) => Number(r.minutes) > 0)
      .map((r) => String(r.date)),
  );
  let day = days.has(today) ? today : addDays(today, -1),
    count = 0;
  while (days.has(day)) {
    count++;
    day = addDays(day, -1);
  }
  return count;
}
export function timerSeconds(timer: Timer, now = Date.now()) {
  const elapsed =
    timer.seconds +
    (timer.status === "running" && timer.startedAt !== null
      ? Math.max(0, (now - timer.startedAt) / 1000)
      : 0);
  return Math.min(timer.duration || Infinity, elapsed);
}
export function pauseTimer(timer: Timer, now = Date.now()): Timer {
  return {
    ...timer,
    seconds: timerSeconds(timer, now),
    startedAt: null,
    status: "paused",
  };
}
export function goalProgress(goal: RecordItem, state: State) {
  const within = (r: RecordItem) =>
    String(r.date || r.completionDate || r.issueDate || "") >=
      String(goal.startDate || "0000") &&
    String(r.date || r.completionDate || r.issueDate || "") <=
      String(goal.dueDate || "9999");
  const goalSkills = String(goal.skills || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const linked = (r: RecordItem) => {
    const course = state.records.courses.find((c) => c.id === r.courseId);
    const recordSkills =
      `${r.skills || ""},${r.skill || ""},${r.language || ""},${r.technologies || ""},${course?.skills || ""}`
        .split(",")
        .map((s) => s.trim().toLowerCase());
    return (
      (!goal.courseId ||
        r.courseId === goal.courseId ||
        r.id === goal.courseId) &&
      (!goalSkills.length || goalSkills.some((s) => recordSkills.includes(s)))
    );
  };
  switch (goal.metric) {
    case "Learning activities":
      return new Set(
        (state.education?.attempts ?? [])
          .filter(
            (a) =>
              a.passed &&
              ["lesson", "question", "challenge", "game"].includes(a.kind) &&
              a.day >= String(goal.startDate || "0000") &&
              a.day <= String(goal.dueDate || "9999") &&
              (!goalSkills.length ||
                goalSkills.includes(a.topic.toLowerCase())),
          )
          .map(
            (a) =>
              `${["question", "game"].includes(a.kind) ? "question" : "code"}:${a.unit}`,
          ),
      ).size;
    case "Study hours":
      return hours(
        state.records.sessions.filter((r) => within(r) && linked(r)),
      );
    case "Coding exercises":
      return state.records.practice.filter(
        (r) => within(r) && linked(r) && r.status === "Completed",
      ).length;
    case "Completed courses":
      return state.records.courses.filter(
        (r) => within(r) && linked(r) && r.status === "Completed",
      ).length;
    case "Completed projects":
      return state.records.projects.filter(
        (r) => within(r) && linked(r) && r.status === "Completed",
      ).length;
    default:
      return Number(goal.currentProgress || 0);
  }
}
export function achievements(state: State) {
  const total = hours(state.records.sessions),
    out: string[] = [];
  if (state.records.courses.some((c) => c.status === "Completed"))
    out.push("First completed course");
  if (state.records.certificates.some((c) => !c.pendingVerification))
    out.push("First certificate recorded");
  [10, 50, 100].forEach((n) => {
    if (total >= n) out.push(`${n} hours studied`);
  });
  if (
    state.records.projects.some(
      (p) => p.status === "Completed" && p.independent === true,
    )
  )
    out.push("First independent coding project");
  if (studyStreak(state) >= 7) out.push("Seven-day learning streak");
  return out;
}
export const safeUrl = (value: unknown) => {
  try {
    const u = new URL(String(value));
    return ["http:", "https:"].includes(u.protocol) ? u.href : undefined;
  } catch {
    return undefined;
  }
};
export const fileLimit = 10 * 1024 * 1024;
export async function validateFile(file: Blob & { name?: string }) {
  if (file.size > fileLimit)
    throw new Error("Attachments must be 10 MB or smaller.");
  const b = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const isPDF = String.fromCharCode(...b.slice(0, 5)) === "%PDF-";
  const png = b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71;
  const jpg = b[0] === 255 && b[1] === 216 && b[2] === 255;
  const webp =
    String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...b.slice(8, 12)) === "WEBP";
  if (!(
    (file.type === "application/pdf" && isPDF) ||
    (file.type === "image/png" && png) ||
    (file.type === "image/jpeg" && jpg) ||
    (file.type === "image/webp" && webp)
  ))
    throw new Error(
      "Use a valid PDF, PNG, JPEG, or WebP file. SVG and executable files are not accepted.",
    );
}
const itemSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1).max(300),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .catchall(
    z.union([z.string().max(200000), z.number().finite(), z.boolean()]),
  );
const recordsSchema = z.object(
  Object.fromEntries(
    kinds.map((k) => [k, z.array(itemSchema).max(20000)]),
  ) as Record<Kind, z.ZodArray<typeof itemSchema>>,
);
export const stateSchema = z.object({
  education: educationSchema.optional(),
  schema: z.literal(1),
  revision: z.number().int().nonnegative(),
  profile: z.object({
    name: z.string().min(1).max(100),
    title: z.string().max(200),
    careerGoals: z.string().max(10000),
    learningHours: z.string().max(200),
    timezone: z.string().refine((t) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: t });
        return true;
      } catch {
        return false;
      }
    }, "Invalid time zone"),
    theme: z.enum(["dark", "light", "system"]),
    weeklyHours: z.number().min(1).max(168),
    role: z.string().max(200),
    notifications: z.boolean(),
    avatar: z
      .string()
      .max(200000)
      .refine(
        (value) =>
          value === "" ||
          /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(value),
        "Avatar must be a local JPEG image.",
      ),
  }),
  records: recordsSchema,
  timer: z
    .object({
      status: z.enum(["running", "paused"]),
      startedAt: z.number().nullable(),
      seconds: z.number().nonnegative(),
      duration: z.number().nonnegative(),
      mode: z.enum(["Focus", "Pomodoro", "Break"]),
      courseId: z.string(),
      skill: z.string(),
      owner: z.string(),
    })
    .nullable(),
});
export function validateState(input: unknown): State {
  const state = stateSchema.parse(input) as State;
  state.education = validateEducation(state.education ?? emptyEducation());
  const ids = new Set<string>();
  kinds.forEach((k) =>
    state.records[k].forEach((r) => {
      if (ids.has(r.id))
        throw new Error("Backup contains duplicate record IDs.");
      ids.add(r.id);
      validateRecord(k, r);
    }),
  );
  return state;
}
export function validateRecord(kind: Kind, r: RecordItem) {
  if (!r.title.trim()) throw new Error("A title is required.");
  for (const key of [
    "totalLessons",
    "completedLessons",
    "manualProgress",
    "estimatedHours",
    "cost",
    "minutes",
    "targetValue",
    "currentProgress",
    "lastDelivered",
  ])
    if (r[key] !== undefined && r[key] !== "" && typeof r[key] !== "number")
      throw new Error(`${key} must be a number.`);
  for (const key of ["totalLessons", "completedLessons"])
    if (typeof r[key] === "number" && !Number.isInteger(r[key]))
      throw new Error("Lesson counts must be whole numbers.");
  for (const [key, value] of Object.entries(r)) {
    if (typeof value === "number" && (!Number.isFinite(value) || value < 0))
      throw new Error(`${key} must be a non-negative number.`);
    if (key.endsWith("Url") || key === "url")
      if (value && !safeUrl(value))
        throw new Error("Links must start with https:// or http://.");
    if ((key.endsWith("Date") || key === "date") && value) {
      const text = String(value),
        parsed = new Date(text + "T12:00:00Z");
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(text) ||
        !Number.isFinite(parsed.getTime()) ||
        parsed.toISOString().slice(0, 10) !== text
      )
        throw new Error("Use a valid calendar date.");
    }
  }
  if (
    kind === "courses" &&
    Number(r.totalLessons) > 0 &&
    Number(r.completedLessons) > Number(r.totalLessons)
  )
    throw new Error("Completed lessons cannot exceed total lessons.");
  if (Number(r.manualProgress) > 100)
    throw new Error("Progress cannot exceed 100%.");
  if (kind === "sessions" || kind === "practice")
    if (Number(r.minutes || 0) <= 0 || Number(r.minutes) > 1440)
      throw new Error("Time must be between 1 and 1,440 minutes.");
  if (
    r.expirationDate &&
    r.issueDate &&
    String(r.expirationDate) < String(r.issueDate)
  )
    throw new Error("Expiration must be on or after the issue date.");
  if (r.dueDate && r.startDate && String(r.dueDate) < String(r.startDate))
    throw new Error("Due date must be on or after the start date.");
  if (kind === "goals" && Number(r.targetValue || 0) <= 0)
    throw new Error("The goal target must be greater than zero.");
  if (kind === "courses" && r.status === "Completed" && !r.completionDate)
    throw new Error(
      "Confirm completion by providing an actual completion date.",
    );
  if (["sessions", "practice"].includes(kind) && !r.date)
    throw new Error("An activity date is required.");
  if (kind === "certificates" && (!r.organization || !r.issueDate))
    throw new Error("Issuing organization and issue date are required.");
  if (kind === "goals" && (!r.startDate || !r.dueDate))
    throw new Error("Goal start and due dates are required.");
  if (
    kind === "reminders" &&
    (!r.scheduledAt ||
      !Number.isFinite(new Date(String(r.scheduledAt)).getTime()))
  )
    throw new Error("A valid reminder time is required.");
}

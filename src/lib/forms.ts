import type { Kind, State } from "./model";
import { allTracks, emptyEducation } from "./education";
export type Field = {
  key: string;
  label: string;
  type?:
    | "text"
    | "textarea"
    | "number"
    | "date"
    | "url"
    | "select"
    | "checkbox"
    | "datetime-local";
  options?: string[];
  required?: boolean;
  default?: string | number | boolean;
  wide?: boolean;
  help?: string;
  link?: Kind;
  max?: number;
  min?: number;
};
const f = (
  key: string,
  label: string,
  type: Field["type"] = "text",
  extra: Partial<Field> = {},
): Field => ({ key, label, type, ...extra });
const title = f("title", "Title", "text", { required: true, wide: true });
const description = f("description", "Description", "textarea", { wide: true });
const notes = f("notes", "Notes", "textarea", { wide: true });
const status = (options: string[]) =>
  f("status", "Status", "select", { options, default: options[0] });
const course = f("courseId", "Related course", "select", { link: "courses" });
const skillsField = f("skills", "Skills", "text", {
  help: "Separate skills with commas, for example JavaScript, React.",
});
const difficulty = f("difficulty", "Difficulty", "select", {
  options: ["Beginner", "Intermediate", "Advanced"],
  default: "Beginner",
});
export const aiOptions = [
  "No AI assistance",
  "Hints only",
  "AI explanation",
  "AI debugging help",
  "AI-generated implementation",
];
export const forms: Record<Kind, Field[]> = {
  courses: [
    title,
    f("provider", "Provider"),
    f("url", "Course URL", "url"),
    f("instructor", "Instructor"),
    f("category", "Category"),
    difficulty,
    description,
    status([
      "Wishlist",
      "Not Started",
      "In Progress",
      "Paused",
      "Completed",
      "Dropped",
    ]),
    f("enrollmentDate", "Enrollment date", "date"),
    f("targetDate", "Target completion date", "date"),
    f("completionDate", "Actual completion date", "date", {
      help: "Required when you explicitly mark the course Completed.",
    }),
    f("totalLessons", "Total lessons", "number", {
      default: 0,
      help: "Use 0 for an unknown lesson count.",
    }),
    f("completedLessons", "Completed lessons", "number", { default: 0 }),
    f("manualProgress", "Manual progress (%)", "number", {
      default: 0,
      max: 100,
      help: "Used only when the lesson count is unknown.",
    }),
    f("estimatedHours", "Estimated hours", "number"),
    f("cost", "Course cost", "number", { default: 0 }),
    f("currency", "Currency", "text", { default: "PHP" }),
    f("certificateAvailability", "Certificate availability", "select", {
      options: [
        "Unknown",
        "Available — see provider requirements",
        "No certificate",
      ],
    }),
    skillsField,
    notes,
  ],
  certificates: [
    title,
    f("organization", "Issuing organization", "text", { required: true }),
    course,
    f("issueDate", "Issue date", "date", { required: true }),
    f("expirationDate", "Expiration date", "date", {
      help: "Leave blank if this credential does not expire.",
    }),
    f("credentialId", "Credential ID"),
    f("verificationUrl", "Verification URL", "url", {
      help: "Saving a link does not verify a credential.",
    }),
    skillsField,
    f("careerPathId", "Related career track", "select"),
    f("milestoneId", "Related learning milestone", "select", {
      link: "milestones",
    }),
    f("visibility", "Visibility", "select", {
      options: ["Private", "Include in learning summary"],
      default: "Private",
      help: "All attachments stay on this device. Visibility controls the summary export.",
    }),
    f("pendingVerification", "Pending verification", "checkbox"),
    notes,
  ],
  practice: [
    title,
    f("date", "Practice date", "date", { required: true }),
    f("language", "Programming language", "text", { required: true }),
    f("topic", "Topic"),
    course,
    description,
    difficulty,
    f("minutes", "Time spent (minutes)", "number", { required: true, min: 1 }),
    f("aiAssistance", "AI assistance", "select", {
      options: aiOptions,
      default: aiOptions[0],
    }),
    status(["In Progress", "Completed", "Revisit"]),
    f("solutionNotes", "Solution notes", "textarea", { wide: true }),
    f("repositoryUrl", "GitHub link", "url"),
    skillsField,
  ],
  projects: [
    title,
    description,
    f("technologies", "Technologies"),
    skillsField,
    f("repositoryUrl", "Repository URL", "url"),
    f("demoUrl", "Live demo URL", "url"),
    f("startDate", "Start date", "date"),
    f("completionDate", "Completion date", "date"),
    status(["Planned", "In Development", "Testing", "Completed", "Archived"]),
    course,
    f("certificateId", "Related certificate", "select", {
      link: "certificates",
    }),
    f("challenges", "Technical challenges", "textarea", { wide: true }),
    f("lessonsLearned", "Lessons learned", "textarea", { wide: true }),
    f("documentation", "Documentation", "textarea", { wide: true }),
    f("aiNotes", "AI assistance notes", "textarea", { wide: true }),
    f("independent", "Built independently", "checkbox", {
      help: "Your own assessment. AI assistance is welcome; record its role above.",
    }),
  ],
  goals: [
    title,
    description,
    f("metric", "Measure", "select", {
      options: [
        "Study hours",
        "Coding exercises",
        "Learning activities",
        "Completed courses",
        "Completed projects",
        "Manual",
      ],
      default: "Study hours",
    }),
    f("targetValue", "Target value", "number", { required: true, min: 0.1 }),
    f("currentProgress", "Manual current progress", "number", {
      default: 0,
      help: "Used only for a Manual goal. Other measures are computed from your records.",
    }),
    f("startDate", "Start date", "date", { required: true }),
    f("dueDate", "Due date", "date", { required: true }),
    course,
    skillsField,
    status(["Active", "Completed", "Paused"]),
    notes,
  ],
  sessions: [
    title,
    f("date", "Study date", "date", { required: true }),
    f("minutes", "Time spent (minutes)", "number", { required: true, min: 1 }),
    course,
    f("skill", "Skill"),
    notes,
  ],
  paths: [title, description, f("targetDate", "Target date", "date"), notes],
  milestones: [
    title,
    f("pathId", "Learning path", "select", { link: "paths", required: true }),
    status(["Not Started", "In Progress", "Completed"]),
    course,
    f("projectId", "Related project", "select", { link: "projects" }),
    f("estimatedHours", "Estimated effort (hours)", "number"),
    f("targetDate", "Target date", "date"),
    f("completionDate", "Completion date", "date"),
    notes,
  ],
  skills: [
    title,
    f("category", "Category", "select", {
      options: ["Frontend", "Backend", "DevOps", "AI & Automation", "Other"],
    }),
    f("confidence", "Self-assessed confidence", "select", {
      options: [
        "Exploring",
        "Learning",
        "Practicing",
        "Comfortable",
        "Ready to demonstrate",
      ],
      default: "Exploring",
    }),
    notes,
  ],
  career: [
    title,
    f("type", "Activity type", "select", {
      options: [
        "Interview practice",
        "Resume update",
        "Job application",
        "Competency",
      ],
    }),
    f("date", "Date", "date"),
    f("organization", "Organization"),
    status(["Planned", "In Progress", "Completed"]),
    f("url", "Link", "url"),
    notes,
  ],
  reminders: [
    title,
    f("reminderType", "Reminder type", "select", {
      options: [
        "Study reminder",
        "Weekly progress summary",
        "Daily learning plan",
        "Scheduled review",
        "Course deadline",
        "Weekly goal",
        "Certificate expiration",
        "New achievement",
      ],
      default: "Study reminder",
    }),
    f("scheduledAt", "Reminder time", "datetime-local", {
      required: true,
      help: "Uses this device’s local time. Delivered while ASCEND is open.",
    }),
    f("repeat", "Repeat", "select", {
      options: ["Once", "Daily", "Weekly"],
      default: "Once",
    }),
    course,
    f("goalId", "Related goal", "select", { link: "goals" }),
    f("certificateId", "Related certificate", "select", {
      link: "certificates",
    }),
    notes,
  ],
};
export function optionsFor(field: Field, state: State) {
  if (field.key === "careerPathId")
    return allTracks(state.education ?? emptyEducation()).map((p) => ({
      value: p.id,
      label: p.title,
    }));
  return field.link
    ? state.records[field.link].map((r) => ({ value: r.id, label: r.title }))
    : field.options?.map((v) => ({ value: v, label: v })) || [];
}
export const names: Record<Kind, string> = {
  courses: "course",
  certificates: "certificate",
  practice: "practice log",
  projects: "project",
  goals: "goal",
  sessions: "study session",
  paths: "learning path",
  milestones: "milestone",
  skills: "skill",
  career: "career activity",
  reminders: "reminder",
};

import { catalog } from "./catalog";
import { allTracks, emptyEducation, mastery } from "./education";
import type { State } from "./model";
import type { LiveCourse } from "./assistant-schema";
export function onlineResource(c: LiveCourse): Resource {
  return {
    id: c.id,
    title: c.title,
    provider: c.provider,
    url: c.url,
    source: c.source,
    topics: c.topics.join(", "),
    difficulty: "Check provider prerequisites",
    cost: "Free open course materials; credential fees may differ",
    certificate:
      "Not verified. Check the provider; ASCEND does not issue this credential.",
    description: c.description,
    prerequisites: "Check the official course page before starting.",
    curriculum: [],
    duration: "Not specified in the catalogue.",
    language: "Check provider.",
    verified: c.checkedAt.slice(0, 10),
    verification: `Discovered in the live provider catalogue at ${c.checkedAt}. Course availability and credential requirements must be confirmed with the provider.`,
    estimatedHours: 0,
    competencies: c.topics,
    type: "Course",
  };
}
export type Resource = {
  id: string;
  title: string;
  provider: string;
  url: string;
  source: string;
  topics: string;
  difficulty: string;
  cost: string;
  certificate: string;
  description: string;
  prerequisites: string;
  curriculum: string[];
  duration: string;
  language: string;
  verified: string;
  verification: string;
  estimatedHours: number;
  competencies: string[];
  type: string;
};
const details = [
  {
    description:
      "A provider curriculum for learning responsive web development. Confirm the currently offered certification track and project requirements on the official site before enrolling.",
    prerequisites: "Not specified.",
    curriculum: [],
    duration: "Not specified.",
    language: "Not specified.",
    competencies: ["variables"],
    type: "Course",
    verification:
      "Official URL checked; dynamic curriculum metadata could not be independently read. Confirm current syllabus with provider.",
  },
  {
    description:
      "An introduction to computational problem solving, progressing from C to Python, SQL and web technologies, with a final project.",
    prerequisites: "No prior computer science experience required.",
    curriculum: [
      "Scratch",
      "C",
      "Arrays",
      "Algorithms",
      "Memory",
      "Data structures",
      "Python",
      "SQL",
      "HTML, CSS, JavaScript",
      "Flask",
      "Final project",
    ],
    duration: "11 weeks of material; self-paced",
    language: "English; additional dubbed lecture languages offered",
    competencies: ["algorithms", "structures", "SQL", "variables"],
    type: "Course",
    verification: "Official syllabus and overview checked.",
  },
  {
    description:
      "Modern web development using React, Node.js APIs and databases, with additional TypeScript and delivery topics.",
    prerequisites:
      "Good programming skills; basic web programming, databases and Git.",
    curriculum: [
      "Web application fundamentals",
      "React",
      "Node.js services",
      "Testing",
      "TypeScript",
      "Continuous integration",
    ],
    duration: "14 parts; each loosely averages 15–20 study hours",
    language: "English version; other translations available",
    competencies: [
      "React",
      "async",
      "api",
      "typescript",
      "testing",
      "GitHub Actions",
    ],
    type: "Course",
    verification:
      "Official general information checked. Certificate exercise thresholds vary by part; consult provider.",
  },
  {
    description:
      "A collection of technology learning resources and eligible digital credential pathways. This entry links to the provider hub, not one fixed course.",
    prerequisites: "Not specified; varies by learning resource.",
    curriculum: [],
    duration: "Not specified.",
    language: "Not specified.",
    competencies: ["api", "architecture"],
    type: "Resource hub",
    verification:
      "Official provider hub checked; individual course syllabus must be checked separately.",
  },
  {
    description:
      "TESDA's online learning portal with vocational and ICT learning offerings. Availability and requirements depend on the selected course.",
    prerequisites: "Not specified; check the selected course.",
    curriculum: [],
    duration: "Not specified.",
    language: "Not specified.",
    competencies: ["Git"],
    type: "Resource hub",
    verification:
      "Official portal checked; no claim that every ICT topic is taught by a specific listed course.",
  },
  {
    description:
      "A web development foundation covering setup, Git, HTML, CSS, JavaScript and introductory projects.",
    prerequisites: "Beginner learning path; follow its setup instructions.",
    curriculum: [
      "Introduction and prerequisites",
      "Git basics",
      "HTML foundations",
      "CSS foundations",
      "JavaScript basics",
    ],
    duration: "Not specified.",
    language: "English",
    competencies: ["Git", "variables", "functions", "arrays"],
    type: "Course",
    verification: "Official course page checked.",
  },
  {
    description:
      "Structured web learning material for new developers, with core web technologies and accessibility.",
    prerequisites:
      "Beginner modules available; start with getting started if new to the web.",
    curriculum: [
      "Getting started",
      "Core modules",
      "HTML",
      "CSS",
      "JavaScript",
      "Accessibility",
    ],
    duration: "Not specified.",
    language: "English page; translations vary",
    competencies: ["variables", "functions", "objects", "async"],
    type: "Learning resource",
    verification: "Official learning index checked.",
  },
  {
    description:
      "Microsoft's training directory of courses, paths and modules. Choose a specific resource for its syllabus and prerequisites.",
    prerequisites: "Not specified; varies by module.",
    curriculum: [],
    duration: "Not specified.",
    language: "Not specified; varies by module.",
    competencies: ["GitHub Actions", "Security"],
    type: "Resource hub",
    verification:
      "Official training hub checked; achievement badges are distinct from exam certifications.",
  },
];
export const resources: Resource[] = catalog.map((c, i) => ({
  ...c,
  id: `catalog-${i}`,
  ...details[i],
  verified: "2026-10-11",
  estimatedHours:
    details[i].type === "Resource hub" ? 0 : i === 1 ? 120 : i === 2 ? 210 : 40,
}));
resources.push(
  {
    id: "laravel-docs",
    title: "Laravel documentation",
    provider: "Official Laravel",
    url: "https://laravel.com/docs/installation",
    source: "https://laravel.com/docs/installation",
    topics: "PHP, Laravel, HTTP, SQL",
    difficulty: "ASCEND classification: intermediate",
    cost: "Free documentation",
    certificate: "Documentation; no completion credential advertised.",
    description:
      "Official Laravel setup and framework reference for building PHP applications.",
    prerequisites:
      "PHP knowledge and a local development environment; follow current installation requirements.",
    curriculum: [
      "Installation",
      "Routing",
      "Controllers",
      "Validation",
      "Database",
      "Testing",
    ],
    duration: "Not specified.",
    language: "English",
    verified: "2026-10-11",
    verification:
      "Official documentation navigation and installation page checked. Documentation is a reference, not a fixed course.",
    estimatedHours: 40,
    competencies: ["PHP", "Laravel", "SQL", "api", "testing"],
    type: "Documentation",
  },
  {
    id: "react-docs",
    title: "React Quick Start",
    provider: "Official React",
    url: "https://react.dev/learn",
    source: "https://react.dev/learn",
    topics: "React, Components, State, Events",
    difficulty: "ASCEND classification: introductory React",
    cost: "Free documentation",
    certificate: "Documentation; no completion credential advertised.",
    description:
      "Official introduction to components, rendering data, handling events and sharing state.",
    prerequisites:
      "JavaScript functions, objects and arrays. Review those first if unfamiliar.",
    curriculum: [
      "Creating components",
      "Displaying data",
      "Conditional rendering",
      "Lists",
      "Events",
      "State",
      "Sharing data",
    ],
    duration: "Not specified.",
    language: "English page",
    verified: "2026-10-11",
    verification: "Official Quick Start page checked.",
    estimatedHours: 12,
    competencies: ["React", "functions", "objects"],
    type: "Documentation",
  },
);
export function recommendResources(state: State) {
  const e = state.education ?? emptyEducation(),
    track = allTracks(e).find((t) => t.id === e.primary) ?? allTracks(e)[0];
  const combined = new Map(resources.map((r) => [r.url.replace(/\/$/, ""), r]));
  for (const course of e.assistant.live) {
    const r = onlineResource(course);
    if (!combined.has(r.url.replace(/\/$/, "")))
      combined.set(r.url.replace(/\/$/, ""), r);
  }
  return [...combined.values()]
    .map((r) => {
      const gaps = r.competencies.filter(
        (t) => track.topics.includes(t) && !mastery(e, t).mastered,
      );
      const learning = state.records.courses.find((c) => c.catalogId === r.id);
      const credentials = learning
        ? state.records.certificates.filter((c) => c.courseId === learning.id)
        : [];
      const score =
        gaps.length * 3 +
        (e.preferred &&
        r.topics.toLowerCase().includes(e.preferred.toLowerCase())
          ? 2
          : 0) -
        (learning?.status === "Completed" ? 5 : 0);
      return {
        ...r,
        score,
        reason:
          learning?.status === "Completed"
            ? `Recorded complete in My Learning${credentials.length ? " with linked credential evidence" : " (external completion is self-reported)"}.`
            : gaps.length
              ? `Supports ${track.title}; practice gaps: ${gaps.join(", ")}.`
              : `An alternative resource for exploration; match its syllabus to your goal.`,
        personal: r.estimatedHours
          ? `${Math.ceil(r.estimatedHours / state.profile.weeklyHours)} weeks at ${state.profile.weeklyHours} h/week (ASCEND planning estimate: ${r.estimatedHours} h, adjustable; not provider duration)`
          : "Select a specific course before estimating effort.",
      };
    })
    .filter((r) => e.budget !== "Free" || r.cost.toLowerCase().includes("free"))
    .sort((a, b) => b.score - a.score);
}

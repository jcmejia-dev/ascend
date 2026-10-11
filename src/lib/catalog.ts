export type CatalogEntry = {
  title: string;
  provider: string;
  url: string;
  topics: string;
  difficulty: string;
  cost: string;
  certificate: string;
  source: string;
};
export const catalog: CatalogEntry[] = [
  {
    title: "Responsive Web Design",
    provider: "freeCodeCamp",
    url: "https://www.freecodecamp.org/learn/",
    topics: "HTML, CSS, Accessibility",
    difficulty: "Beginner",
    cost: "Free",
    certificate: "Free certification after provider requirements.",
    source: "https://www.freecodecamp.org/learn/",
  },
  {
    title: "CS50’s Introduction to Computer Science",
    provider: "Harvard CS50",
    url: "https://cs50.harvard.edu/x/",
    topics: "Computer science, C, Python, SQL",
    difficulty: "Beginner · challenging",
    cost: "Free course; paid edX verified option",
    certificate:
      "Free CS50 certificate requires qualifying assignments and final project.",
    source: "https://cs50.harvard.edu/x/certificate/",
  },
  {
    title: "Full Stack Open",
    provider: "University of Helsinki",
    url: "https://fullstackopen.com/en/",
    topics: "React, Node.js, TypeScript, Testing",
    difficulty: "Intermediate",
    cost: "Free",
    certificate: "Free course certificate; exercise requirements apply.",
    source: "https://fullstackopen.com/en/part0/general_info/",
  },
  {
    title: "Technology learning resources",
    provider: "IBM SkillsBuild",
    url: "https://skillsbuild.org/",
    topics: "AI, Web development, Professional skills",
    difficulty: "Beginner",
    cost: "Free",
    certificate:
      "Digital credentials for eligible learning paths; check each path.",
    source: "https://skillsbuild.org/",
  },
  {
    title: "TESDA Online Program",
    provider: "TESDA",
    url: "https://e-tesda.gov.ph/",
    topics: "ICT, Workplace skills",
    difficulty: "Beginner",
    cost: "Free online courses",
    certificate:
      "Completion certificates; national certification has separate assessment requirements.",
    source: "https://e-tesda.gov.ph/",
  },
  {
    title: "Foundations",
    provider: "The Odin Project",
    url: "https://www.theodinproject.com/paths/foundations/courses/foundations",
    topics: "HTML, CSS, JavaScript, Git",
    difficulty: "Beginner",
    cost: "Free",
    certificate: "No completion certificate.",
    source: "https://www.theodinproject.com/faq",
  },
  {
    title: "Learn web development",
    provider: "MDN Web Docs",
    url: "https://developer.mozilla.org/en-US/docs/Learn_web_development",
    topics: "HTML, CSS, JavaScript, Accessibility",
    difficulty: "Beginner",
    cost: "Free learning materials",
    certificate: "Learning resource; no certificate advertised.",
    source: "https://developer.mozilla.org/en-US/docs/Learn_web_development",
  },
  {
    title: "Developer learning paths",
    provider: "Microsoft Learn",
    url: "https://learn.microsoft.com/en-us/training/",
    topics: "Cloud, Development, DevOps",
    difficulty: "Beginner to advanced",
    cost: "Training is free; certification exams may cost extra",
    certificate: "Learning achievements differ from exam-based certifications.",
    source: "https://learn.microsoft.com/en-us/training/",
  },
];

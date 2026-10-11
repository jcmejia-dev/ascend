import { load } from "cheerio";
import { createHash } from "node:crypto";
import { liveCourseSchema, type LiveCourse } from "../src/lib/assistant-schema.js";
export const catalogSources = [
  {
    url: "https://cs50.harvard.edu/x/courses/",
    provider: "Harvard CS50",
    host: "cs50.harvard.edu",
  },
  {
    url: "https://see.stanford.edu/Course",
    provider: "Stanford Engineering Everywhere (archive)",
    host: "see.stanford.edu",
  },
];
export function parseCatalog(
  html: string,
  source: (typeof catalogSources)[number],
  checkedAt = new Date().toISOString(),
): LiveCourse[] {
  const $ = load(html);
  $("script,style,svg,nav,header,footer").remove();
  const found = new Map<string, LiveCourse>();
  $("a[href]").each((_, a) => {
    try {
      const u = new URL($(a).attr("href")!, source.url);
      u.search = "";
      u.hash = "";
      if (
        u.protocol !== "https:" ||
        u.hostname !== source.host ||
        u.username ||
        u.password
      )
        return;
      if (
        source.host === "cs50.harvard.edu"
          ? !/^\/[a-z][a-z0-9-]*\/?$/.test(u.pathname)
          : !/^\/Course\/[A-Z]{2}\d+[A-Z]?\/?$/.test(u.pathname)
      )
        return;
      let title = $(a).text().replace(/\s+/g, " ").trim();
      if (title.length < 4 || title.length > 200 || found.has(u.href)) return;
      const context = (
        $(a).closest("li").text() || $(a).parent().parent().text()
      )
        .replace(/\s+/g, " ")
        .trim();
      if (/no longer (offered|available)|discontinued/i.test(context)) return;
      const words = (title + " " + context).toLowerCase(),
        topics: string[] = [];
      if (/programming|computer science|software|cs50x|cs50 python/.test(words))
        topics.push("variables", "functions", "algorithms");
      if (/sql|database/.test(words)) topics.push("SQL");
      if (/javascript|web/.test(words))
        topics.push("objects", "arrays", "async");
      if (/artificial intelligence|machine learning|cs50 ai/.test(words))
        topics.push("LLM");
      if (/security|cyber/.test(words)) topics.push("Security");
      if (/testing/.test(words)) topics.push("testing");
      if (/react/.test(words)) topics.push("React");
      found.set(
        u.href,
        liveCourseSchema.parse({
          id:
            "online-" +
            createHash("sha256")
              .update(u.href.replace(/\/$/, ""))
              .digest("hex")
              .slice(0, 20),
          title,
          provider: source.provider,
          url: u.href,
          source: source.url,
          description:
            context.slice(0, 600) ||
            "Open course materials. Check the provider for current syllabus and prerequisites.",
          topics: [...new Set(topics)],
          checkedAt,
        }),
      );
    } catch {
      /* Ignore unsafe or malformed links. */
    }
  });
  return [...found.values()].slice(0, 60);
}
export function createCourseSearch(fetcher: typeof fetch = fetch) {
  const cache = new Map<string, { at: number; courses: LiveCourse[] }>(),
    pending = new Map<string, Promise<LiveCourse[]>>();
  async function catalogue(source: (typeof catalogSources)[number]) {
    const cached = cache.get(source.url);
    if (cached && Date.now() - cached.at < 6 * 60 * 60 * 1000)
      return cached.courses;
    if (pending.has(source.url)) return pending.get(source.url)!;
    const promise = (async () => {
      const response = await fetcher(source.url, {
        redirect: "error",
        signal: AbortSignal.timeout(8000),
        headers: {
          Accept: "text/html",
          "User-Agent": "ASCEND-CourseDiscovery/1.0",
        },
      });
      if (
        !response.ok ||
        !response.headers.get("content-type")?.includes("text/html") ||
        !response.body
      )
        throw new Error("Provider catalogue unavailable.");
      const reader = response.body.getReader(),
        chunks: Uint8Array[] = [];
      let length = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          length += value.length;
          if (length > 1024 * 1024)
            throw new Error("Provider catalogue too large.");
          chunks.push(value);
        }
      } catch (error) {
        await reader.cancel();
        throw error;
      } finally {
        reader.releaseLock();
      }
      const courses = parseCatalog(Buffer.concat(chunks).toString(), source);
      if (!courses.length)
        throw new Error("Provider catalogue format changed.");
      cache.set(source.url, { at: Date.now(), courses });
      return courses;
    })();
    pending.set(source.url, promise);
    try {
      return await promise;
    } finally {
      pending.delete(source.url);
    }
  }
  return async (query: string) => {
    const tokens = query
      .toLowerCase()
      .replace(/[^a-z0-9+# ]/g, " ")
      .split(/\s+/)
      .filter(
        (t) =>
          t.length > 1 &&
          ![
            "developer",
            "course",
            "courses",
            "free",
            "learn",
            "beginner",
            "and",
            "the",
          ].includes(t),
      );
    const results = await Promise.allSettled(catalogSources.map(catalogue));
    let failures = 0;
    const courses = results
      .flatMap((result) => {
        if (result.status === "rejected") {
          failures++;
          return [];
        }
        return result.value;
      })
      .map((c) => ({
        ...c,
        score: tokens.reduce(
          (score, t) =>
            score +
            (c.title.toLowerCase().includes(t) ? 5 : 0) +
            (c.description.toLowerCase().includes(t) ? 1 : 0) +
            (c.topics.some((topic) => topic.toLowerCase() === t) ? 3 : 0),
          0,
        ),
      }))
      .filter((c) => !tokens.length || c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map(({ score, ...c }) => c);
    return {
      courses,
      checkedAt: new Date().toISOString(),
      status:
        failures === 2
          ? "Provider catalogues unavailable; using saved recommendations."
          : failures
            ? "One provider catalogue is unavailable; results from the other provider are available."
            : "Searched official Harvard CS50 and Stanford SEE catalogues.",
      providers: catalogSources.map((s) => ({
        name: s.provider,
        url: s.url,
        checkedAt: cache.get(s.url)?.courses[0]?.checkedAt || null,
      })),
      coverage:
        "Official catalogues, not a whole-web search. Stanford SEE materials are archived.",
    };
  };
}

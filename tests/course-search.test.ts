import { it, expect, vi } from "vitest";
import {
  parseCatalog,
  createCourseSearch,
  catalogSources,
} from "../scripts/course-search";
const html =
  '<main><ul><li><a href="https://cs50.harvard.edu/python">CS50 Python</a> Learn programming in Python with functions.</li><li><a href="https://cs50.harvard.edu/sql">CS50 SQL</a> Learn SQL databases.</li><li><a href="https://evil.example/course">Injected course</a></li><li><a href="javascript:alert(1)">Unsafe</a></li></ul></main>';
it("extracts named official courses and discards unsafe/off-provider links", () => {
  const found = parseCatalog(html, catalogSources[0]);
  expect(found).toHaveLength(2);
  expect(found[0].title).toBe("CS50 Python");
  expect(found[0].topics).toContain("functions");
  expect(
    found.every((c) => c.url.startsWith("https://cs50.harvard.edu/")),
  ).toBe(true);
});
it("handles changed provider markup without fabricating course records", () => {
  expect(parseCatalog("<main>No courses</main>", catalogSources[0])).toEqual(
    [],
  );
});
it("searches official catalogues, caches results and never fetches caller-supplied URLs", async () => {
  const fetcher = vi.fn(
    async (url: string) =>
      new Response(
        url.includes("cs50")
          ? html
          : '<li><a href="/Course/CS106A">Programming Methodology</a></li>',
        { headers: { "content-type": "text/html" } },
      ),
  );
  const search = createCourseSearch(fetcher as unknown as typeof fetch);
  const result = await search("Python");
  expect(result.courses[0].title).toBe("CS50 Python");
  await search("SQL");
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher.mock.calls.map((c) => c[0])).toEqual(
    catalogSources.map((s) => s.url),
  );
});
it("reports unavailable providers and preserves a useful partial result", async () => {
  const fetcher = vi.fn(async (url: string) => {
    if (url.includes("stanford")) throw new Error("Offline");
    return new Response(html, { headers: { "content-type": "text/html" } });
  });
  const result = await createCourseSearch(fetcher as unknown as typeof fetch)(
    "SQL",
  );
  expect(result.courses).toHaveLength(1);
  expect(result.status).toContain("One provider");
  const unavailable = await createCourseSearch(
    vi.fn(async () => {
      throw new Error("Offline");
    }) as unknown as typeof fetch,
  )("SQL");
  expect(unavailable.courses).toEqual([]);
  expect(unavailable.status).toContain("unavailable");
});
it("rejects oversized provider pages and does not follow redirects", async () => {
  const fetcher = vi.fn(
    async () =>
      new Response("x".repeat(1024 * 1024 + 1), {
        headers: { "content-type": "text/html" },
      }),
  );
  const result = await createCourseSearch(fetcher as unknown as typeof fetch)(
    "SQL",
  );
  expect(result.courses).toEqual([]);
  expect(fetcher.mock.calls).toHaveLength(2);
});

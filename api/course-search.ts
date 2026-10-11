import type { IncomingMessage, ServerResponse } from "node:http";
import { createCourseSearch } from "../scripts/course-search";

// Vercel Node function. No user records, credentials or private documents are
// accepted by this public endpoint. It only queries allowlisted catalogues.
const search = createCourseSearch();

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.writeHead(405).end(JSON.stringify({ error: "Method not allowed." }));
    return;
  }
  try {
    const url = new URL(req.url || "/", "https://ascend.invalid");
    const query = (url.searchParams.get("q") || "").trim();
    if (!query || query.length > 120) {
      res.writeHead(400).end(
        JSON.stringify({ error: "Search must contain 1 to 120 characters." }),
      );
      return;
    }
    const result = await search(query);
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=600, stale-while-revalidate=1800",
    );
    res.writeHead(200).end(JSON.stringify(result));
  } catch {
    res.writeHead(503).end(
      JSON.stringify({
        error: "Course discovery is temporarily unavailable. Try again later.",
      }),
    );
  }
}

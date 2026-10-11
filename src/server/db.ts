import pg from "pg";

let pool: pg.Pool | undefined;
export function database(): pg.Pool {
  const url = process.env.DATABASE_URL;
  if (!url || !/^postgres(ql)?:\/\//.test(url))
    throw new Error("DATABASE_URL is not configured.");
  if (!pool) {
    pool = new pg.Pool({
      connectionString: url,
      max: 3,
      connectionTimeoutMillis: 8000,
      idleTimeoutMillis: 10000,
      allowExitOnIdle: true,
    });
    pool.on("error", () => {
      // Individual queries surface their errors; never log credentials.
    });
  }
  return pool;
}

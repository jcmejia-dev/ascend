import { readFile } from "node:fs/promises";
import pg from "pg";
const url = process.env.DATABASE_URL;
if (!url || !/^postgres(ql)?:\/\//.test(url)) {
  console.error("DATABASE_URL must be configured as a server-only secret.");
  process.exit(1);
}
const pool = new pg.Pool({
  connectionString: url, max: 1, connectionTimeoutMillis: 8000,
});
try {
  for (const filename of ["db/001_neon_schema.sql", "db/002_cloud_runtime.sql"]) {
    const sql = await readFile(filename, "utf8");
    await pool.query(sql);
    console.log("Applied:", filename);
  }
  const result = await pool.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name LIKE 'ascend_%'
    ORDER BY table_name
  `);
  const expected = [
    "ascend_attachment_data", "ascend_attachments", "ascend_rate_limits",
    "ascend_sessions", "ascend_users", "ascend_workspaces",
  ];
  const names = result.rows.map((row) => row.table_name);
  if (!expected.every((name) => names.includes(name)))
    throw new Error("Database schema verification failed.");
  console.log("ASCEND database verified:", expected.join(", "));
} catch (error) {
  console.error("Database migration failed:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
} finally {
  await pool.end();
}

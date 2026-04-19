import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "DATABASE_URL not set. Run via: npm run db:init (reads .env.local)",
  );
  process.exit(1);
}

const sql = postgres(url, { max: 1 });
try {
  await sql.file("sql/001_init.sql");
  console.log("✓ schema initialized");
} catch (err) {
  console.error("✗ failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await sql.end();
}

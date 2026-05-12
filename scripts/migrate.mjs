// One-shot migration runner: applies every .sql file in supabase/migrations/
// in filename order. Each file runs inside a single transaction.
//
// Usage:  node --env-file=.env.local scripts/migrate.mjs

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const url = process.env.DATABASE_URL ?? process.env.MIGRATION_DATABASE_URL;
if (!url) {
  console.error(
    "✗ DATABASE_URL is not set. Make sure you're running with --env-file=.env.local",
  );
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const migDir = join(here, "..", "supabase", "migrations");

const files = readdirSync(migDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.error("✗ No .sql files found in supabase/migrations/");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });

try {
  await client.connect();
  console.log(`→ Connected. Running ${files.length} migration file(s).\n`);

  for (const f of files) {
    const sql = readFileSync(join(migDir, f), "utf8");
    process.stdout.write(`  ${f} … `);
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("COMMIT");
      console.log("ok");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      console.log("FAILED");
      console.error(`\n✗ ${f} failed:`);
      console.error(err.message);
      process.exit(1);
    }
  }

  console.log("\n✓ All migrations applied.");
} finally {
  await client.end();
}

/**
 * One-shot migration: apply 0001_public_profiles to a live database.
 *
 * The auto-generated SQL also includes a `CREATE TABLE segment_feedback`
 * statement which would fail on instances bootstrapped via `db:push` (table
 * already exists). This script applies *only* the four reviewer ALTERs that
 * are the true intent of the migration, with idempotent guards so it can be
 * re-run safely.
 *
 * Run with:  npx tsx scripts/apply-public-profiles.ts
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import mysql from "mysql2/promise";

// Tiny .env loader so the script doesn't need to add a dotenv dependency.
function loadDotenv(file: string) {
  if (!existsSync(file)) return;
  const content = readFileSync(file, "utf-8");
  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotenv(resolve(process.cwd(), ".env.local"));
loadDotenv(resolve(process.cwd(), ".env"));

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set — copy .env.example to .env.local first");
  }

  const conn = await mysql.createConnection(url);

  try {
    console.log("→ Connected. Inspecting current schema…");

    const [columnsRows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reviewers'`
    );
    const columns = new Set(columnsRows.map((r) => r.COLUMN_NAME as string));

    const [constraintRows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reviewers'`
    );
    const constraints = new Set(
      constraintRows.map((r) => r.CONSTRAINT_NAME as string)
    );

    const [indexRows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT INDEX_NAME FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reviewers'`
    );
    const indexes = new Set(indexRows.map((r) => r.INDEX_NAME as string));

    if (!columns.has("display_name")) {
      console.log("→ Adding column display_name…");
      await conn.execute(
        "ALTER TABLE `reviewers` ADD COLUMN `display_name` varchar(100) NULL"
      );
    } else {
      console.log("✓ Column display_name already present.");
    }

    if (!columns.has("is_public")) {
      console.log("→ Adding column is_public…");
      await conn.execute(
        "ALTER TABLE `reviewers` ADD COLUMN `is_public` boolean NOT NULL DEFAULT true"
      );
    } else {
      console.log("✓ Column is_public already present.");
    }

    if (!constraints.has("reviewers_display_name_unique")) {
      console.log("→ Adding unique constraint on display_name…");
      await conn.execute(
        "ALTER TABLE `reviewers` ADD CONSTRAINT `reviewers_display_name_unique` UNIQUE(`display_name`)"
      );
    } else {
      console.log("✓ Unique constraint already present.");
    }

    if (!indexes.has("display_name_idx")) {
      console.log("→ Creating index display_name_idx…");
      await conn.execute(
        "CREATE INDEX `display_name_idx` ON `reviewers` (`display_name`)"
      );
    } else {
      console.log("✓ Index display_name_idx already present.");
    }

    // Verify
    const [verify] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_DEFAULT
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reviewers'
         AND COLUMN_NAME IN ('display_name', 'is_public')`
    );
    console.log("\nFinal state:");
    console.table(verify);

    console.log("\n✅ Migration applied successfully.");
    console.log(
      "   display_name will be backfilled lazily by /api/segments/next on next sign-in."
    );
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("\n❌ Migration failed:");
  console.error(err);
  process.exit(1);
});

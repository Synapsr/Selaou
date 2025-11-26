#!/usr/bin/env npx tsx

/**
 * Script to sync audio sources from configured data sources
 *
 * Usage:
 *   npx tsx scripts/sync-sources.ts
 *
 * Or with npm script:
 *   npm run sync
 */

import { createSQLAdapterFromEnv } from "../src/lib/data-sources/adapters/sql-adapter";
import { createJSONAdapterFromEnv } from "../src/lib/data-sources/adapters/json-adapter";
import { importFromAdapter } from "../src/lib/data-sources/importer";

async function main() {
  console.log("🔄 Starting data source sync...\n");

  // Try SQL adapter
  const sqlAdapter = createSQLAdapterFromEnv();
  if (sqlAdapter) {
    console.log("📊 SQL Adapter enabled");
    try {
      const result = await importFromAdapter(sqlAdapter);
      console.log(`   ✅ Imported: ${result.imported}`);
      console.log(`   ⏭️  Skipped: ${result.skipped}`);
      if (result.errors.length > 0) {
        console.log(`   ❌ Errors: ${result.errors.length}`);
        result.errors.forEach((e) => console.log(`      - ${e}`));
      }
    } catch (error) {
      console.error(`   ❌ SQL adapter error:`, error);
    }
    console.log("");
  }

  // Try JSON adapter
  const jsonAdapter = createJSONAdapterFromEnv();
  if (jsonAdapter) {
    console.log("📁 JSON Adapter enabled");
    try {
      const result = await importFromAdapter(jsonAdapter);
      console.log(`   ✅ Imported: ${result.imported}`);
      console.log(`   ⏭️  Skipped: ${result.skipped}`);
      if (result.errors.length > 0) {
        console.log(`   ❌ Errors: ${result.errors.length}`);
        result.errors.forEach((e) => console.log(`      - ${e}`));
      }
    } catch (error) {
      console.error(`   ❌ JSON adapter error:`, error);
    }
    console.log("");
  }

  if (!sqlAdapter && !jsonAdapter) {
    console.log("⚠️  No data sources enabled.");
    console.log("   Configure DATASOURCE_SQL_ENABLED=true or DATASOURCE_JSON_ENABLED=true");
    console.log("   in your .env file.");
  }

  console.log("✨ Sync complete!");
}

main().catch(console.error);

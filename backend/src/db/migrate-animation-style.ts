import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config(); // fallback to cwd

import fs from "fs/promises";
import type { PoolClient } from "pg";
import { pool } from "../config/database";

/**
 * Phase 14 (Stage 4): portfolio animation style migration runner.
 * Follows the PUB-02 runner pattern: pass a client to run inside a caller's
 * transaction (tests), or omit it to use a pooled connection.
 *
 *   npx tsx src/db/migrate-animation-style.ts            # apply
 *   npx tsx src/db/migrate-animation-style.ts --rollback # roll back
 */
const MIGRATION_FILE = "20261123_phase14_animation_style.sql";
const ROLLBACK_FILE = "20261123_phase14_animation_style_rollback.sql";

async function runSqlFile(fileName: string, client?: PoolClient): Promise<void> {
  const shouldRelease = !client;
  const dbClient = client || (await pool.connect());

  try {
    const sql = await fs.readFile(path.join(__dirname, "migrations", fileName), "utf-8");
    await dbClient.query(sql);
  } finally {
    if (shouldRelease) {
      dbClient.release();
    }
  }
}

export function runAnimationStyleMigration(client?: PoolClient): Promise<void> {
  return runSqlFile(MIGRATION_FILE, client);
}

export function rollbackAnimationStyleMigration(client?: PoolClient): Promise<void> {
  return runSqlFile(ROLLBACK_FILE, client);
}

// Allow direct CLI execution if run directly
if (require.main === module || process.argv[1]?.includes("migrate-animation-style")) {
  const isRollback = process.argv.includes("--rollback");
  const action = isRollback ? rollbackAnimationStyleMigration : runAnimationStyleMigration;
  const label = isRollback ? "Rollback" : "Migration";

  action()
    .then(async () => {
      console.log(`Phase 14 animation style ${label} completed successfully.`);
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error(`Phase 14 animation style ${label} failed:`, err);
      await pool.end();
      process.exit(1);
    });
}

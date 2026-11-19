import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config(); // fallback to cwd

import fs from "fs/promises";
import { pool } from "../config/database";

export async function runPub02Migration(client?: any) {
  const shouldRelease = !client;
  const dbClient = client || (await pool.connect());

  try {
    const migrationPath = path.join(
      __dirname,
      "migrations",
      "20261118_pub02_publishing_indexing.sql"
    );
    const sql = await fs.readFile(migrationPath, "utf-8");

    await dbClient.query(sql);
  } finally {
    if (shouldRelease) {
      dbClient.release();
    }
  }
}

export async function rollbackPub02Migration(client?: any) {
  const shouldRelease = !client;
  const dbClient = client || (await pool.connect());

  try {
    const rollbackPath = path.join(
      __dirname,
      "migrations",
      "20261118_pub02_publishing_indexing_rollback.sql"
    );
    const sql = await fs.readFile(rollbackPath, "utf-8");

    await dbClient.query(sql);
  } finally {
    if (shouldRelease) {
      dbClient.release();
    }
  }
}

// Allow direct CLI execution if run directly
if (require.main === module || process.argv[1]?.includes("migrate-pub02")) {
  const isRollback = process.argv.includes("--rollback");
  const action = isRollback ? rollbackPub02Migration : runPub02Migration;
  const label = isRollback ? "Rollback" : "Migration";

  action()
    .then(async () => {
      console.log(`PUB-02 ${label} completed successfully.`);
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error(`PUB-02 ${label} failed:`, err);
      await pool.end();
      process.exit(1);
    });
}

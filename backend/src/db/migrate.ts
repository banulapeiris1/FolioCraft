import fs from "fs/promises";
import path from "path";
import { pool } from "../config/database";

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log("Starting database migration...");

    const schemaPath = path.join(__dirname, "schema.sql");
    const sql = await fs.readFile(schemaPath, "utf-8");

    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");

    console.log("Database migration completed successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Migration failed, transaction rolled back:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();

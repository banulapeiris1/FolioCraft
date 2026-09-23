import test from "node:test";
import assert from "node:assert/strict";
import { pool } from "../config/database";

test("SKILL-05: Database Schema & Migration Verification Suite (skill_catalog)", async (t) => {
  const uniqueTag = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const testSkillName = `CatalogTestSkill_${uniqueTag}`;

  t.after(async () => {
    try {
      await pool.query("DELETE FROM skill_catalog WHERE name = $1", [testSkillName]);
    } catch (e) {
      console.error("Cleanup error in skillCatalog.schema.test.ts:", e);
    }
  });

  await t.test("1. skill_catalog table exists in the public schema", async () => {
    const res = await pool.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_name = 'skill_catalog'`
    );
    assert.equal(res.rows.length, 1, "Expected skill_catalog table to exist in public schema");
  });

  await t.test("2. skill_catalog table has all required columns with expected data types and constraints", async () => {
    const res = await pool.query(
      `SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
       FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = 'skill_catalog'`
    );
    const columns = new Map(res.rows.map((row) => [row.column_name, row]));

    const expectedCols = ["id", "name", "category", "icon_key", "created_at"];
    for (const col of expectedCols) {
      assert.ok(columns.has(col), `Column ${col} must exist on skill_catalog table`);
    }

    const idCol = columns.get("id");
    assert.equal(idCol.data_type, "uuid", "id should be UUID");
    assert.equal(idCol.is_nullable, "NO", "id must be NOT NULL");

    const nameCol = columns.get("name");
    assert.equal(nameCol.data_type, "character varying", "name should be VARCHAR");
    assert.equal(nameCol.character_maximum_length, 100, "name should be VARCHAR(100)");
    assert.equal(nameCol.is_nullable, "NO", "name must be NOT NULL");

    const catCol = columns.get("category");
    assert.equal(catCol.data_type, "character varying", "category should be VARCHAR");
    assert.equal(catCol.character_maximum_length, 50, "category should be VARCHAR(50)");
    assert.equal(catCol.is_nullable, "NO", "category must be NOT NULL");

    const iconCol = columns.get("icon_key");
    assert.equal(iconCol.data_type, "character varying", "icon_key should be VARCHAR");
    assert.equal(iconCol.character_maximum_length, 50, "icon_key should be VARCHAR(50)");
    assert.equal(iconCol.is_nullable, "YES", "icon_key may be nullable");

    const createdAtCol = columns.get("created_at");
    assert.equal(createdAtCol.data_type, "timestamp with time zone", "created_at should be TIMESTAMPTZ");
  });

  await t.test("3. primary key is configured on id column with UUID default generation", async () => {
    const res = await pool.query(
      `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
       WHERE tc.constraint_type = 'PRIMARY KEY'
         AND tc.table_name = 'skill_catalog'
         AND tc.table_schema = 'public'`
    );
    assert.equal(res.rows.length, 1, "Expected single primary key on skill_catalog table");
    assert.equal(res.rows[0].column_name, "id", "Primary key must be id");

    const defRes = await pool.query(
      `SELECT column_default FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'skill_catalog' AND column_name = 'id'`
    );
    assert.match(
      String(defRes.rows[0].column_default),
      /gen_random_uuid\(\)/i,
      "id should default to gen_random_uuid()"
    );
  });

  await t.test("4. unique constraint exists on name column", async () => {
    const res = await pool.query(
      `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
       WHERE tc.constraint_type = 'UNIQUE'
         AND tc.table_name = 'skill_catalog'
         AND tc.table_schema = 'public'`
    );
    assert.ok(
      res.rows.some((r) => r.column_name === "name"),
      "Unique constraint must exist on name column"
    );
  });

  await t.test("5. index on category column exists (idx_skill_catalog_category)", async () => {
    const res = await pool.query(
      `SELECT indexname, indexdef
       FROM pg_indexes
       WHERE tablename = 'skill_catalog' AND schemaname = 'public'`
    );
    const categoryIndex = res.rows.find((r) => r.indexname === "idx_skill_catalog_category");
    assert.ok(categoryIndex, "Expected idx_skill_catalog_category index to exist");
    assert.match(categoryIndex.indexdef, /category/i, "Index must target category column");
  });

  await t.test("6. initial seed data exists across expected categories", async () => {
    const res = await pool.query(
      `SELECT name, category FROM skill_catalog ORDER BY name ASC`
    );
    assert.ok(res.rows.length >= 30, `Expected at least 30 seed records, found ${res.rows.length}`);

    const names = new Set(res.rows.map((r) => r.name));
    assert.ok(names.has("React"), "React should exist in catalog");
    assert.ok(names.has("Node.js"), "Node.js should exist in catalog");
    assert.ok(names.has("PostgreSQL"), "PostgreSQL should exist in catalog");
    assert.ok(names.has("Docker"), "Docker should exist in catalog");
    assert.ok(names.has("Git"), "Git should exist in catalog");
  });

  await t.test("7. duplicate insertion on name is rejected by UNIQUE constraint", async () => {
    await pool.query(
      `INSERT INTO skill_catalog (name, category) VALUES ($1, $2)`,
      [testSkillName, "Testing"]
    );

    await assert.rejects(
      async () => {
        await pool.query(
          `INSERT INTO skill_catalog (name, category) VALUES ($1, $2)`,
          [testSkillName, "AnotherCategory"]
        );
      },
      (err: any) => {
        assert.equal(err.code, "23505", "Expected Postgres unique_violation error code 23505");
        return true;
      }
    );
  });

  await t.test("8. ON CONFLICT (name) DO NOTHING handles duplicates idempotently", async () => {
    const res = await pool.query(
      `INSERT INTO skill_catalog (name, category)
       VALUES ($1, $2)
       ON CONFLICT (name) DO NOTHING
       RETURNING id`,
      [testSkillName, "Testing"]
    );
    assert.equal(res.rows.length, 0, "Expected 0 rows returned due to DO NOTHING conflict resolution");
  });
});

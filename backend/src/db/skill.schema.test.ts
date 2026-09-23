import test from "node:test";
import assert from "node:assert/strict";
import { pool } from "../config/database";

test("SKILL-01: Database Schema & Migration Verification Suite", async (t) => {
  const uniqueTag = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const testUserEmail = `skill_schema_${uniqueTag}@foliocraft.test`;
  let testUserId: string | null = null;
  let testPortfolioId: string | null = null;
  let testSkillId: string | null = null;

  t.after(async () => {
    try {
      if (testSkillId) {
        await pool.query("DELETE FROM skills WHERE id = $1", [testSkillId]);
      }
      if (testPortfolioId) {
        await pool.query("DELETE FROM portfolios WHERE id = $1", [testPortfolioId]);
      }
      if (testUserId) {
        await pool.query("DELETE FROM users WHERE id = $1", [testUserId]);
      }
    } catch (e) {
      console.error("Cleanup error in skill.schema.test.ts:", e);
    }
  });

  await t.test("1. skills table exists in the public schema", async () => {
    const res = await pool.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_name = 'skills'`
    );
    assert.equal(res.rows.length, 1, "Expected skills table to exist in public schema");
  });

  await t.test("2. skills table has all required columns with expected data types and constraints", async () => {
    const res = await pool.query(
      `SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
       FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = 'skills'`
    );
    const columns = new Map(res.rows.map((row) => [row.column_name, row]));

    const expectedCols = [
      "id",
      "portfolio_id",
      "name",
      "category",
      "order_index",
      "created_at",
      "updated_at",
    ];

    for (const col of expectedCols) {
      assert.ok(columns.has(col), `Column ${col} must exist on skills table`);
    }

    const idCol = columns.get("id");
    assert.equal(idCol.data_type, "uuid", "id should be UUID");
    assert.equal(idCol.is_nullable, "NO", "id must be NOT NULL");

    const portfolioIdCol = columns.get("portfolio_id");
    assert.equal(portfolioIdCol.data_type, "uuid", "portfolio_id should be UUID");
    assert.equal(portfolioIdCol.is_nullable, "NO", "portfolio_id must be NOT NULL");

    const nameCol = columns.get("name");
    assert.equal(nameCol.data_type, "character varying", "name should be VARCHAR");
    assert.equal(nameCol.character_maximum_length, 100, "name should be VARCHAR(100)");
    assert.equal(nameCol.is_nullable, "NO", "name must be NOT NULL");

    const catCol = columns.get("category");
    assert.equal(catCol.data_type, "character varying", "category should be VARCHAR");
    assert.equal(catCol.character_maximum_length, 50, "category should be VARCHAR(50)");
    assert.equal(catCol.is_nullable, "NO", "category must be NOT NULL");

    const orderCol = columns.get("order_index");
    assert.equal(orderCol.data_type, "integer", "order_index should be integer");
    assert.equal(orderCol.is_nullable, "NO", "order_index must be NOT NULL");
    assert.match(String(orderCol.column_default), /0/, "order_index default should be 0");

    const createdAtCol = columns.get("created_at");
    assert.equal(createdAtCol.data_type, "timestamp with time zone", "created_at should be TIMESTAMPTZ");

    const updatedAtCol = columns.get("updated_at");
    assert.equal(updatedAtCol.data_type, "timestamp with time zone", "updated_at should be TIMESTAMPTZ");
  });

  await t.test("3. primary key is configured on id column with UUID default generation", async () => {
    const res = await pool.query(
      `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
       WHERE tc.constraint_type = 'PRIMARY KEY'
         AND tc.table_name = 'skills'
         AND tc.table_schema = 'public'`
    );
    assert.equal(res.rows.length, 1, "Expected single primary key on skills table");
    assert.equal(res.rows[0].column_name, "id", "Primary key must be id");

    const defRes = await pool.query(
      `SELECT column_default FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'skills' AND column_name = 'id'`
    );
    assert.match(
      String(defRes.rows[0].column_default),
      /gen_random_uuid\(\)/i,
      "id should default to gen_random_uuid()"
    );
  });

  await t.test("4. foreign key constraint links skills.portfolio_id to portfolios.id with ON DELETE CASCADE", async () => {
    const res = await pool.query(
      `SELECT
         tc.constraint_name,
         kcu.column_name,
         ccu.table_name AS foreign_table_name,
         ccu.column_name AS foreign_column_name,
         rc.delete_rule
       FROM information_schema.table_constraints AS tc
       JOIN information_schema.key_column_usage AS kcu
         ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
       JOIN information_schema.referential_constraints AS rc
         ON tc.constraint_name = rc.constraint_name
       JOIN information_schema.constraint_column_usage AS ccu
         ON rc.unique_constraint_name = ccu.constraint_name
         AND rc.unique_constraint_schema = ccu.constraint_schema
       WHERE tc.constraint_type = 'FOREIGN KEY'
         AND tc.table_name = 'skills'`
    );

    assert.ok(res.rows.length >= 1, "Foreign key constraint must exist on skills table");
    const fk = res.rows.find((r) => r.column_name === "portfolio_id");
    assert.ok(fk, "Foreign key must be on portfolio_id column");
    assert.equal(fk.foreign_table_name, "portfolios");
    assert.equal(fk.foreign_column_name, "id");
    assert.equal(fk.delete_rule, "CASCADE");
  });

  await t.test("5. index exists on portfolio_id column (idx_skills_portfolio_id)", async () => {
    const res = await pool.query(
      `SELECT indexname, indexdef
       FROM pg_indexes
       WHERE schemaname = 'public'
         AND tablename = 'skills'
         AND indexname = 'idx_skills_portfolio_id'`
    );
    assert.equal(res.rows.length, 1, "Index idx_skills_portfolio_id must exist");
  });

  await t.test("6. insert skill succeeds with all fields and auto-generated UUID", async () => {
    // 1. Create a user
    const userRes = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["Skill Tester", testUserEmail, "dummy_pw"]
    );
    testUserId = userRes.rows[0].id;

    // 2. Create a portfolio
    const portRes = await pool.query(
      `INSERT INTO portfolios (user_id, name, title, username)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [testUserId, "Skill Owner", "Lead Developer", `skilluser_${uniqueTag}`]
    );
    testPortfolioId = portRes.rows[0].id;

    // 3. Insert skill
    const skillRes = await pool.query(
      `INSERT INTO skills (portfolio_id, name, category, order_index)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [testPortfolioId, "TypeScript", "Languages", 3]
    );

    assert.equal(skillRes.rows.length, 1);
    const created = skillRes.rows[0];
    testSkillId = created.id;

    assert.ok(created.id, "Auto-generated UUID must be present");
    assert.equal(created.portfolio_id, testPortfolioId);
    assert.equal(created.name, "TypeScript");
    assert.equal(created.category, "Languages");
    assert.equal(created.order_index, 3);
    assert.ok(created.created_at instanceof Date);
    assert.ok(created.updated_at instanceof Date);
  });

  await t.test("7. inserting skill with minimal fields receives default order_index 0", async () => {
    assert.ok(testPortfolioId);
    const skillRes = await pool.query(
      `INSERT INTO skills (portfolio_id, name, category)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [testPortfolioId, "PostgreSQL", "Databases"]
    );

    assert.equal(skillRes.rows.length, 1);
    const created = skillRes.rows[0];

    assert.equal(created.order_index, 0, "Default order_index should be 0");
    assert.equal(created.name, "PostgreSQL");
    assert.equal(created.category, "Databases");

    // Clean up minimal skill
    await pool.query("DELETE FROM skills WHERE id = $1", [created.id]);
  });

  await t.test("8. inserting skill without portfolio_id or NULL portfolio_id fails NOT NULL constraint", async () => {
    await assert.rejects(
      async () => {
        await pool.query(
          `INSERT INTO skills (portfolio_id, name, category)
           VALUES (NULL, $1, $2)`,
          ["React", "Frontend"]
        );
      },
      (err: any) => {
        assert.equal(err.code, "23502", "Expected NOT NULL violation (23502)");
        return true;
      }
    );
  });

  await t.test("9. inserting skill with NULL name fails NOT NULL constraint", async () => {
    assert.ok(testPortfolioId);
    await assert.rejects(
      async () => {
        await pool.query(
          `INSERT INTO skills (portfolio_id, name, category)
           VALUES ($1, NULL, $2)`,
          [testPortfolioId, "Frontend"]
        );
      },
      (err: any) => {
        assert.equal(err.code, "23502", "Expected NOT NULL violation (23502)");
        return true;
      }
    );
  });

  await t.test("10. inserting skill with NULL category fails NOT NULL constraint", async () => {
    assert.ok(testPortfolioId);
    await assert.rejects(
      async () => {
        await pool.query(
          `INSERT INTO skills (portfolio_id, name, category)
           VALUES ($1, $2, NULL)`,
          [testPortfolioId, "Docker"]
        );
      },
      (err: any) => {
        assert.equal(err.code, "23502", "Expected NOT NULL violation (23502)");
        return true;
      }
    );
  });

  await t.test("11. inserting skill with non-existent portfolio_id is rejected by foreign key constraint", async () => {
    const nonExistentPortfolioId = "00000000-0000-0000-0000-000000000000";
    await assert.rejects(
      async () => {
        await pool.query(
          `INSERT INTO skills (portfolio_id, name, category)
           VALUES ($1, $2, $3)`,
          [nonExistentPortfolioId, "Rust", "Languages"]
        );
      },
      (err: any) => {
        assert.equal(err.code, "23503", "Expected Foreign Key violation (23503)");
        return true;
      }
    );
  });

  await t.test("12. ON DELETE CASCADE removes skills automatically when parent portfolio is deleted", async () => {
    assert.ok(testPortfolioId);
    assert.ok(testSkillId);

    // Delete portfolio
    await pool.query("DELETE FROM portfolios WHERE id = $1", [testPortfolioId]);

    // Check skill was deleted via CASCADE
    const checkSkill = await pool.query("SELECT id FROM skills WHERE id = $1", [testSkillId]);
    assert.equal(
      checkSkill.rows.length,
      0,
      "Skill should be automatically removed via ON DELETE CASCADE when portfolio is deleted"
    );

    testPortfolioId = null;
    testSkillId = null;
  });
});

import test from "node:test";
import assert from "node:assert/strict";
import { pool } from "../config/database";

test("EXP-02: Experience Database Schema & Migration Verification Suite", async (t) => {
  const uniqueTag = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const testUserEmail = `exp_schema_${uniqueTag}@foliocraft.test`;
  let testUserId: string | null = null;
  let testPortfolioId: string | null = null;
  let testExperienceId: string | null = null;

  t.after(async () => {
    try {
      if (testExperienceId) {
        await pool.query("DELETE FROM experience WHERE id = $1", [testExperienceId]);
      }
      if (testPortfolioId) {
        await pool.query("DELETE FROM portfolios WHERE id = $1", [testPortfolioId]);
      }
      if (testUserId) {
        await pool.query("DELETE FROM users WHERE id = $1", [testUserId]);
      }
    } catch (e) {
      console.error("Cleanup error in experience.schema.test.ts:", e);
    }
  });

  await t.test("1. experience table exists in the public schema", async () => {
    const res = await pool.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_name = 'experience'`
    );
    assert.equal(res.rows.length, 1, "Expected experience table to exist in public schema");
  });

  await t.test("2. experience table has all required columns with expected data types, character limits, and constraints", async () => {
    const res = await pool.query<{
      column_name: string;
      data_type: string;
      character_maximum_length: number | null;
      is_nullable: string;
      column_default: string | null;
    }>(
      `SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
       FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = 'experience'`
    );
    const columns = new Map(res.rows.map((row) => [row.column_name, row]));

    const expectedCols = [
      "id",
      "portfolio_id",
      "company",
      "position",
      "description",
      "start_date",
      "end_date",
      "is_current",
      "created_at",
      "updated_at",
    ];

    for (const col of expectedCols) {
      assert.ok(columns.has(col), `Column ${col} must exist on experience table`);
    }

    // 1. id column
    const idCol = columns.get("id")!;
    assert.equal(idCol.data_type, "uuid", "id should be UUID");
    assert.equal(idCol.is_nullable, "NO", "id must be NOT NULL");
    assert.ok(
      idCol.column_default && idCol.column_default.includes("gen_random_uuid"),
      "id must have gen_random_uuid() default"
    );

    // 2. portfolio_id column
    const portfolioIdCol = columns.get("portfolio_id")!;
    assert.equal(portfolioIdCol.data_type, "uuid", "portfolio_id should be UUID");
    assert.equal(portfolioIdCol.is_nullable, "NO", "portfolio_id must be NOT NULL");

    // 3. company column
    const companyCol = columns.get("company")!;
    assert.equal(companyCol.data_type, "character varying", "company should be character varying");
    assert.equal(companyCol.character_maximum_length, 255, "company max length should be 255");
    assert.equal(companyCol.is_nullable, "NO", "company must be NOT NULL");

    // 4. position column
    const positionCol = columns.get("position")!;
    assert.equal(positionCol.data_type, "character varying", "position should be character varying");
    assert.equal(positionCol.character_maximum_length, 255, "position max length should be 255");
    assert.equal(positionCol.is_nullable, "NO", "position must be NOT NULL");

    // 5. description column
    const descCol = columns.get("description")!;
    assert.equal(descCol.data_type, "text", "description should be TEXT");
    assert.equal(descCol.is_nullable, "YES", "description must be NULLABLE");

    // 6. start_date column
    const startDateCol = columns.get("start_date")!;
    assert.equal(startDateCol.data_type, "date", "start_date should be DATE");
    assert.equal(startDateCol.is_nullable, "NO", "start_date must be NOT NULL");

    // 7. end_date column
    const endDateCol = columns.get("end_date")!;
    assert.equal(endDateCol.data_type, "date", "end_date should be DATE");
    assert.equal(endDateCol.is_nullable, "YES", "end_date must be NULLABLE");

    // 8. is_current column
    const isCurrentCol = columns.get("is_current")!;
    assert.equal(isCurrentCol.data_type, "boolean", "is_current should be boolean");
    assert.equal(isCurrentCol.is_nullable, "NO", "is_current must be NOT NULL");
    assert.ok(
      isCurrentCol.column_default && isCurrentCol.column_default.includes("false"),
      "is_current must have DEFAULT false"
    );

    // 9. created_at column
    const createdAtCol = columns.get("created_at")!;
    assert.equal(createdAtCol.data_type, "timestamp with time zone", "created_at should be TIMESTAMPTZ");
    assert.equal(createdAtCol.is_nullable, "YES", "created_at can be nullable with default");
    assert.ok(
      createdAtCol.column_default &&
        (createdAtCol.column_default.includes("CURRENT_TIMESTAMP") ||
          createdAtCol.column_default.includes("now")),
      "created_at must have CURRENT_TIMESTAMP default"
    );

    // 10. updated_at column
    const updatedAtCol = columns.get("updated_at")!;
    assert.equal(updatedAtCol.data_type, "timestamp with time zone", "updated_at should be TIMESTAMPTZ");
    assert.equal(updatedAtCol.is_nullable, "YES", "updated_at can be nullable with default");
    assert.ok(
      updatedAtCol.column_default &&
        (updatedAtCol.column_default.includes("CURRENT_TIMESTAMP") ||
          updatedAtCol.column_default.includes("now")),
      "updated_at must have CURRENT_TIMESTAMP default"
    );
  });

  await t.test("3. primary key is configured on id column", async () => {
    const res = await pool.query(
      `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
       WHERE tc.constraint_type = 'PRIMARY KEY'
         AND tc.table_name = 'experience'
         AND tc.table_schema = 'public'`
    );
    assert.equal(res.rows.length, 1, "Expected single primary key column");
    assert.equal(res.rows[0].column_name, "id");
  });

  await t.test("4. foreign key constraint links experience.portfolio_id to portfolios.id with ON DELETE CASCADE", async () => {
    const res = await pool.query<{
      constraint_name: string;
      column_name: string;
      foreign_table_name: string;
      foreign_column_name: string;
      delete_rule: string;
    }>(
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
         AND tc.table_name = 'experience'`
    );

    assert.ok(res.rows.length >= 1, "Foreign key constraint must exist on experience table");
    const fk = res.rows.find((r) => r.column_name === "portfolio_id");
    assert.ok(fk, "Foreign key must be on portfolio_id column");
    assert.equal(fk.foreign_table_name, "portfolios", "Foreign key target must be portfolios");
    assert.equal(fk.foreign_column_name, "id", "Foreign key target column must be id");
    assert.equal(fk.delete_rule, "CASCADE", "Foreign key delete rule must be CASCADE");
  });

  await t.test("5. index exists on portfolio_id column (idx_experience_portfolio_id)", async () => {
    const res = await pool.query<{ indexname: string; indexdef: string }>(
      `SELECT indexname, indexdef
       FROM pg_indexes
       WHERE schemaname = 'public'
         AND tablename = 'experience'
         AND indexname = 'idx_experience_portfolio_id'`
    );
    assert.equal(res.rows.length, 1, "Index idx_experience_portfolio_id must exist");
    assert.ok(
      res.rows[0].indexdef.includes("portfolio_id"),
      "Index must reference portfolio_id column"
    );
  });

  await t.test("6. inserting full experience record succeeds and returns typed columns", async () => {
    // 1. Create user
    const userRes = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["Experience Tester", testUserEmail, "dummy_pw"]
    );
    testUserId = userRes.rows[0].id;

    // 2. Create portfolio
    const portRes = await pool.query<{ id: string }>(
      `INSERT INTO portfolios (user_id, name, title, username)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [testUserId, "Portfolio Owner", "Staff Engineer", `expuser_${uniqueTag}`]
    );
    testPortfolioId = portRes.rows[0].id;

    // 3. Insert experience
    const expRes = await pool.query<{
      id: string;
      portfolio_id: string;
      company: string;
      position: string;
      description: string;
      start_date: Date;
      end_date: Date;
      is_current: boolean;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO experience (
         portfolio_id, company, position, description,
         start_date, end_date, is_current
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        testPortfolioId,
        "Acme Corp",
        "Senior Backend Engineer",
        "Architected scalable microservices and database engines.",
        "2021-03-01",
        "2023-08-31",
        false,
      ]
    );

    assert.equal(expRes.rows.length, 1);
    const created = expRes.rows[0];
    testExperienceId = created.id;

    assert.equal(created.portfolio_id, testPortfolioId);
    assert.equal(created.company, "Acme Corp");
    assert.equal(created.position, "Senior Backend Engineer");
    assert.equal(
      created.description,
      "Architected scalable microservices and database engines."
    );
    assert.equal(created.is_current, false);
    assert.ok(created.start_date instanceof Date);
    assert.ok(created.end_date instanceof Date);
    assert.ok(created.created_at instanceof Date);
    assert.ok(created.updated_at instanceof Date);
  });

  await t.test("7. inserting current experience with minimal fields receives default is_current false (or explicit true) and null end_date", async () => {
    assert.ok(testPortfolioId);

    // Minimal insert without is_current (should default to false)
    const minRes = await pool.query<{
      id: string;
      company: string;
      position: string;
      description: string | null;
      end_date: Date | null;
      is_current: boolean;
    }>(
      `INSERT INTO experience (portfolio_id, company, position, start_date)
       VALUES ($1, $2, $3, $4)
       RETURNING id, company, position, description, end_date, is_current`,
      [testPortfolioId, "Startup Labs", "Lead Developer", "2024-01-15"]
    );

    assert.equal(minRes.rows.length, 1);
    const minRow = minRes.rows[0];
    assert.equal(minRow.company, "Startup Labs");
    assert.equal(minRow.position, "Lead Developer");
    assert.equal(minRow.description, null, "Default description should be null");
    assert.equal(minRow.end_date, null, "Default end_date should be null");
    assert.equal(minRow.is_current, false, "Default is_current should be false");

    // Clean up minimal entry
    await pool.query("DELETE FROM experience WHERE id = $1", [minRow.id]);

    // Insert active role with explicit is_current = true
    const currRes = await pool.query<{
      id: string;
      is_current: boolean;
      end_date: Date | null;
    }>(
      `INSERT INTO experience (portfolio_id, company, position, start_date, is_current)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, is_current, end_date`,
      [testPortfolioId, "Current Employer Inc", "Principal Architect", "2024-02-01", true]
    );

    assert.equal(currRes.rows.length, 1);
    const currRow = currRes.rows[0];
    assert.equal(currRow.is_current, true, "is_current should be true");
    assert.equal(currRow.end_date, null, "end_date should be null for current role");

    await pool.query("DELETE FROM experience WHERE id = $1", [currRow.id]);
  });

  await t.test("8. inserting experience without required NOT NULL fields fails", async () => {
    assert.ok(testPortfolioId);

    // Missing company
    await assert.rejects(
      async () => {
        await pool.query(
          `INSERT INTO experience (portfolio_id, position, start_date)
           VALUES ($1, $2, $3)`,
          [testPortfolioId, "Engineer", "2023-01-01"]
        );
      },
      /null value in column "company"/
    );

    // Missing position
    await assert.rejects(
      async () => {
        await pool.query(
          `INSERT INTO experience (portfolio_id, company, start_date)
           VALUES ($1, $2, $3)`,
          [testPortfolioId, "Acme", "2023-01-01"]
        );
      },
      /null value in column "position"/
    );

    // Missing start_date
    await assert.rejects(
      async () => {
        await pool.query(
          `INSERT INTO experience (portfolio_id, company, position)
           VALUES ($1, $2, $3)`,
          [testPortfolioId, "Acme", "Engineer"]
        );
      },
      /null value in column "start_date"/
    );
  });

  await t.test("9. inserting experience with non-existent portfolio_id is rejected by foreign key constraint", async () => {
    const nonExistentPortfolioId = "00000000-0000-0000-0000-000000000000";
    await assert.rejects(
      async () => {
        await pool.query(
          `INSERT INTO experience (portfolio_id, company, position, start_date)
           VALUES ($1, $2, $3, $4)`,
          [nonExistentPortfolioId, "Company", "Role", "2023-01-01"]
        );
      },
      /violates foreign key constraint/
    );
  });

  await t.test("10. ON DELETE CASCADE removes experience automatically when parent portfolio is deleted", async () => {
    assert.ok(testPortfolioId);
    assert.ok(testExperienceId);

    // Delete the portfolio
    await pool.query("DELETE FROM portfolios WHERE id = $1", [testPortfolioId]);

    // Check experience was deleted via CASCADE
    const checkExp = await pool.query("SELECT id FROM experience WHERE id = $1", [testExperienceId]);
    assert.equal(
      checkExp.rows.length,
      0,
      "Experience must be automatically removed when parent portfolio is deleted via ON DELETE CASCADE"
    );

    testPortfolioId = null;
    testExperienceId = null;
  });
});

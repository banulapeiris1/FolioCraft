import test from "node:test";
import assert from "node:assert/strict";
import { pool } from "../config/database";

test("EDU-02: Education Database Schema & Migration Verification Suite", async (t) => {
  const uniqueTag = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const testUserEmail = `edu_schema_${uniqueTag}@foliocraft.test`;
  let testUserId: string | null = null;
  let testPortfolioId: string | null = null;
  let testEducationId: string | null = null;

  t.after(async () => {
    try {
      if (testEducationId) {
        await pool.query("DELETE FROM education WHERE id = $1", [testEducationId]);
      }
      if (testPortfolioId) {
        await pool.query("DELETE FROM portfolios WHERE id = $1", [testPortfolioId]);
      }
      if (testUserId) {
        await pool.query("DELETE FROM users WHERE id = $1", [testUserId]);
      }
    } catch (e) {
      console.error("Cleanup error in education.schema.test.ts:", e);
    }
  });

  await t.test("1. education table exists in the public schema", async () => {
    const res = await pool.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_name = 'education'`
    );
    assert.equal(res.rows.length, 1, "Expected education table to exist in public schema");
  });

  await t.test("2. education table has all required columns with expected data types and constraints", async () => {
    const res = await pool.query(
      `SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
       FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = 'education'`
    );
    const columns = new Map(res.rows.map((row) => [row.column_name, row]));

    const expectedCols = [
      "id",
      "portfolio_id",
      "institution",
      "degree",
      "field",
      "start_date",
      "end_date",
      "description",
      "created_at",
      "updated_at",
    ];

    for (const col of expectedCols) {
      assert.ok(columns.has(col), `Column ${col} must exist on education table`);
    }

    // 3. id is UUID and 7. NOT NULL
    const idCol = columns.get("id");
    assert.equal(idCol.data_type, "uuid", "id should be UUID");
    assert.equal(idCol.is_nullable, "NO", "id must be NOT NULL");

    // 6. portfolio_id is UUID and 7. NOT NULL
    const portfolioIdCol = columns.get("portfolio_id");
    assert.equal(portfolioIdCol.data_type, "uuid", "portfolio_id should be UUID");
    assert.equal(portfolioIdCol.is_nullable, "NO", "portfolio_id must be NOT NULL");

    // 10. institution is VARCHAR(255) and NOT NULL
    const instCol = columns.get("institution");
    assert.equal(instCol.data_type, "character varying", "institution should be VARCHAR");
    assert.equal(instCol.character_maximum_length, 255, "institution should be VARCHAR(255)");
    assert.equal(instCol.is_nullable, "NO", "institution must be NOT NULL");

    // 11. degree is VARCHAR(255) and NOT NULL
    const degCol = columns.get("degree");
    assert.equal(degCol.data_type, "character varying", "degree should be VARCHAR");
    assert.equal(degCol.character_maximum_length, 255, "degree should be VARCHAR(255)");
    assert.equal(degCol.is_nullable, "NO", "degree must be NOT NULL");

    // 12. field is VARCHAR(255) and NOT NULL
    const fieldCol = columns.get("field");
    assert.equal(fieldCol.data_type, "character varying", "field should be VARCHAR");
    assert.equal(fieldCol.character_maximum_length, 255, "field should be VARCHAR(255)");
    assert.equal(fieldCol.is_nullable, "NO", "field must be NOT NULL");

    // 13. start_date is DATE and NOT NULL
    const startDateCol = columns.get("start_date");
    assert.equal(startDateCol.data_type, "date", "start_date should be DATE");
    assert.equal(startDateCol.is_nullable, "NO", "start_date must be NOT NULL");

    // 14. end_date is DATE and nullable
    const endDateCol = columns.get("end_date");
    assert.equal(endDateCol.data_type, "date", "end_date should be DATE");
    assert.equal(endDateCol.is_nullable, "YES", "end_date must be nullable");

    // 15. description is TEXT and nullable
    const descCol = columns.get("description");
    assert.equal(descCol.data_type, "text", "description should be TEXT");
    assert.equal(descCol.is_nullable, "YES", "description must be nullable");

    // 16. created_at exists with timestamp type/default consistent with existing tables
    const createdAtCol = columns.get("created_at");
    assert.equal(createdAtCol.data_type, "timestamp with time zone", "created_at should be TIMESTAMPTZ");
    assert.match(String(createdAtCol.column_default), /CURRENT_TIMESTAMP/i, "created_at default should be CURRENT_TIMESTAMP");

    // 17. updated_at exists with timestamp type/default consistent with existing tables
    const updatedAtCol = columns.get("updated_at");
    assert.equal(updatedAtCol.data_type, "timestamp with time zone", "updated_at should be TIMESTAMPTZ");
    assert.match(String(updatedAtCol.column_default), /CURRENT_TIMESTAMP/i, "updated_at default should be CURRENT_TIMESTAMP");
  });

  // 4. id is the primary key and 5. id has a UUID default
  await t.test("3. primary key is configured on id column with UUID default generation", async () => {
    const res = await pool.query(
      `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
       WHERE tc.constraint_type = 'PRIMARY KEY'
         AND tc.table_name = 'education'
         AND tc.table_schema = 'public'`
    );
    assert.equal(res.rows.length, 1, "Expected single primary key on education table");
    assert.equal(res.rows[0].column_name, "id", "Primary key must be id");

    const defRes = await pool.query(
      `SELECT column_default FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'education' AND column_name = 'id'`
    );
    assert.match(
      String(defRes.rows[0].column_default),
      /gen_random_uuid\(\)/i,
      "id should default to gen_random_uuid()"
    );
  });

  // 8. portfolio_id references portfolios(id) and 9. Foreign key uses ON DELETE CASCADE
  await t.test("4. foreign key constraint links education.portfolio_id to portfolios.id with ON DELETE CASCADE", async () => {
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
         AND tc.table_name = 'education'`
    );

    assert.ok(res.rows.length >= 1, "Foreign key constraint must exist on education table");
    const fk = res.rows.find((r) => r.column_name === "portfolio_id");
    assert.ok(fk, "Foreign key must be on portfolio_id column");
    assert.equal(fk.foreign_table_name, "portfolios");
    assert.equal(fk.foreign_column_name, "id");
    assert.equal(fk.delete_rule, "CASCADE");
  });

  // 18. idx_education_portfolio_id exists
  await t.test("5. index exists on portfolio_id column (idx_education_portfolio_id)", async () => {
    const res = await pool.query(
      `SELECT indexname, indexdef
       FROM pg_indexes
       WHERE schemaname = 'public'
         AND tablename = 'education'
         AND indexname = 'idx_education_portfolio_id'`
    );
    assert.equal(res.rows.length, 1, "Index idx_education_portfolio_id must exist");
  });

  // 19. A valid Education record can be inserted
  await t.test("6. insert valid education record succeeds with all fields and auto-generated UUID", async () => {
    // 1. Create user
    const userRes = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["Education Tester", testUserEmail, "dummy_pw"]
    );
    testUserId = userRes.rows[0].id;

    // 2. Create portfolio
    const portRes = await pool.query(
      `INSERT INTO portfolios (user_id, name, title, username)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [testUserId, "Education Owner", "Software Engineer", `eduuser_${uniqueTag}`]
    );
    testPortfolioId = portRes.rows[0].id;

    // 3. Insert full education record
    const eduRes = await pool.query(
      `INSERT INTO education (
         portfolio_id, institution, degree, field, start_date, end_date, description
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        testPortfolioId,
        "University of Colombo",
        "B.Sc. (Hons)",
        "Computer Science",
        "2020-01-15",
        "2024-06-30",
        "Graduated with First Class Honors and Dean's List recognition.",
      ]
    );

    assert.equal(eduRes.rows.length, 1);
    const created = eduRes.rows[0];
    testEducationId = created.id;

    assert.ok(created.id, "Auto-generated UUID must be present");
    assert.equal(created.portfolio_id, testPortfolioId);
    assert.equal(created.institution, "University of Colombo");
    assert.equal(created.degree, "B.Sc. (Hons)");
    assert.equal(created.field, "Computer Science");
    assert.ok(created.start_date, "start_date must be returned");
    assert.ok(created.end_date, "end_date must be returned");
    assert.equal(created.description, "Graduated with First Class Honors and Dean's List recognition.");
    assert.ok(created.created_at instanceof Date);
    assert.ok(created.updated_at instanceof Date);
  });

  // 20. Education with end_date = NULL can be inserted (ongoing studies)
  await t.test("7. education with end_date = NULL can be inserted for ongoing education", async () => {
    assert.ok(testPortfolioId);
    const ongoingRes = await pool.query(
      `INSERT INTO education (
         portfolio_id, institution, degree, field, start_date, end_date, description
       )
       VALUES ($1, $2, $3, $4, $5, NULL, $6)
       RETURNING *`,
      [
        testPortfolioId,
        "MIT",
        "M.Sc.",
        "Artificial Intelligence",
        "2024-09-01",
        "Currently pursuing Master of Science in AI.",
      ]
    );

    assert.equal(ongoingRes.rows.length, 1);
    const ongoing = ongoingRes.rows[0];
    assert.equal(ongoing.end_date, null, "end_date should be null for ongoing education");
    assert.equal(ongoing.institution, "MIT");

    // Clean up ongoing record
    await pool.query("DELETE FROM education WHERE id = $1", [ongoing.id]);
  });

  // 21. Education with description = NULL can be inserted
  await t.test("8. education with description = NULL can be inserted", async () => {
    assert.ok(testPortfolioId);
    const minimalRes = await pool.query(
      `INSERT INTO education (
         portfolio_id, institution, degree, field, start_date
       )
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        testPortfolioId,
        "Stanford University",
        "Certificate",
        "Cloud Architecture",
        "2023-05-01",
      ]
    );

    assert.equal(minimalRes.rows.length, 1);
    const minimal = minimalRes.rows[0];
    assert.equal(minimal.description, null, "description should default/allow NULL");
    assert.equal(minimal.end_date, null, "end_date should allow NULL when omitted");

    // Clean up minimal record
    await pool.query("DELETE FROM education WHERE id = $1", [minimal.id]);
  });

  // 23. Required NOT NULL fields reject invalid inserts
  await t.test("9. inserting education with NULL portfolio_id fails NOT NULL constraint", async () => {
    await assert.rejects(
      async () => {
        await pool.query(
          `INSERT INTO education (portfolio_id, institution, degree, field, start_date)
           VALUES (NULL, $1, $2, $3, $4)`,
          ["University", "Degree", "Field", "2020-01-01"]
        );
      },
      (err: any) => {
        assert.equal(err.code, "23502", "Expected NOT NULL violation (23502)");
        return true;
      }
    );
  });

  await t.test("10. inserting education with NULL institution fails NOT NULL constraint", async () => {
    assert.ok(testPortfolioId);
    await assert.rejects(
      async () => {
        await pool.query(
          `INSERT INTO education (portfolio_id, institution, degree, field, start_date)
           VALUES ($1, NULL, $2, $3, $4)`,
          [testPortfolioId, "Degree", "Field", "2020-01-01"]
        );
      },
      (err: any) => {
        assert.equal(err.code, "23502", "Expected NOT NULL violation (23502)");
        return true;
      }
    );
  });

  await t.test("11. inserting education with NULL degree fails NOT NULL constraint", async () => {
    assert.ok(testPortfolioId);
    await assert.rejects(
      async () => {
        await pool.query(
          `INSERT INTO education (portfolio_id, institution, degree, field, start_date)
           VALUES ($1, $2, NULL, $3, $4)`,
          [testPortfolioId, "Institution", "Field", "2020-01-01"]
        );
      },
      (err: any) => {
        assert.equal(err.code, "23502", "Expected NOT NULL violation (23502)");
        return true;
      }
    );
  });

  await t.test("12. inserting education with NULL field fails NOT NULL constraint", async () => {
    assert.ok(testPortfolioId);
    await assert.rejects(
      async () => {
        await pool.query(
          `INSERT INTO education (portfolio_id, institution, degree, field, start_date)
           VALUES ($1, $2, $3, NULL, $4)`,
          [testPortfolioId, "Institution", "Degree", "2020-01-01"]
        );
      },
      (err: any) => {
        assert.equal(err.code, "23502", "Expected NOT NULL violation (23502)");
        return true;
      }
    );
  });

  await t.test("13. inserting education with NULL start_date fails NOT NULL constraint", async () => {
    assert.ok(testPortfolioId);
    await assert.rejects(
      async () => {
        await pool.query(
          `INSERT INTO education (portfolio_id, institution, degree, field, start_date)
           VALUES ($1, $2, $3, $4, NULL)`,
          [testPortfolioId, "Institution", "Degree", "Field"]
        );
      },
      (err: any) => {
        assert.equal(err.code, "23502", "Expected NOT NULL violation (23502)");
        return true;
      }
    );
  });

  await t.test("14. inserting education with non-existent portfolio_id is rejected by foreign key constraint", async () => {
    const nonExistentPortfolioId = "00000000-0000-0000-0000-000000000000";
    await assert.rejects(
      async () => {
        await pool.query(
          `INSERT INTO education (portfolio_id, institution, degree, field, start_date)
           VALUES ($1, $2, $3, $4, $5)`,
          [nonExistentPortfolioId, "Institution", "Degree", "Field", "2020-01-01"]
        );
      },
      (err: any) => {
        assert.equal(err.code, "23503", "Expected Foreign Key violation (23503)");
        return true;
      }
    );
  });

  // 22. Deleting a portfolio cascades and removes its Education records
  await t.test("15. ON DELETE CASCADE removes education records automatically when parent portfolio is deleted", async () => {
    assert.ok(testPortfolioId);
    assert.ok(testEducationId);

    // Delete portfolio
    await pool.query("DELETE FROM portfolios WHERE id = $1", [testPortfolioId]);

    // Check education record was deleted via CASCADE
    const checkEdu = await pool.query("SELECT id FROM education WHERE id = $1", [testEducationId]);
    assert.equal(
      checkEdu.rows.length,
      0,
      "Education record should be automatically removed via ON DELETE CASCADE when portfolio is deleted"
    );

    testPortfolioId = null;
    testEducationId = null;
  });
});

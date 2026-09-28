import test from "node:test";
import assert from "node:assert/strict";
import { pool } from "../config/database";

test("CV-02: CV Upload Database Schema & Migration Verification Suite", async (t) => {
  const uniqueTag = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const testUserEmail = `cv_schema_${uniqueTag}@foliocraft.test`;
  let testUserId: string | null = null;
  let testPortfolioId: string | null = null;
  const createdCvUploadIds: string[] = [];

  t.after(async () => {
    try {
      for (const cvId of createdCvUploadIds) {
        await pool.query("DELETE FROM cv_uploads WHERE id = $1", [cvId]);
      }
      if (testPortfolioId) {
        await pool.query("DELETE FROM portfolios WHERE id = $1", [testPortfolioId]);
      }
      if (testUserId) {
        await pool.query("DELETE FROM users WHERE id = $1", [testUserId]);
      }
    } catch (e) {
      console.error("Cleanup error in cv.schema.test.ts:", e);
    }
  });

  await t.test("1. cv_uploads table exists in the public schema", async () => {
    const res = await pool.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_name = 'cv_uploads'`
    );
    assert.equal(res.rows.length, 1, "Expected cv_uploads table to exist in public schema");
  });

  await t.test("2. cv_uploads table has all required columns with expected data types and constraints", async () => {
    const res = await pool.query<{
      column_name: string;
      data_type: string;
      character_maximum_length: number | null;
      is_nullable: string;
      column_default: string | null;
    }>(
      `SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
       FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = 'cv_uploads'`
    );
    const columns = new Map(res.rows.map((row) => [row.column_name, row]));

    const expectedCols = [
      "id",
      "user_id",
      "portfolio_id",
      "file_name",
      "file_size",
      "mime_type",
      "status",
      "raw_text",
      "parsed_data",
      "error_message",
      "created_at",
      "updated_at",
    ];

    for (const col of expectedCols) {
      assert.ok(columns.has(col), `Column ${col} must exist on cv_uploads table`);
    }

    // 1. id column
    const idCol = columns.get("id")!;
    assert.equal(idCol.data_type, "uuid", "id should be UUID");
    assert.equal(idCol.is_nullable, "NO", "id must be NOT NULL");
    assert.ok(
      idCol.column_default && idCol.column_default.includes("gen_random_uuid"),
      "id must have gen_random_uuid() default"
    );

    // 2. user_id column
    const userIdCol = columns.get("user_id")!;
    assert.equal(userIdCol.data_type, "uuid", "user_id should be UUID");
    assert.equal(userIdCol.is_nullable, "NO", "user_id must be NOT NULL");

    // 3. portfolio_id column
    const portfolioIdCol = columns.get("portfolio_id")!;
    assert.equal(portfolioIdCol.data_type, "uuid", "portfolio_id should be UUID");
    assert.equal(portfolioIdCol.is_nullable, "YES", "portfolio_id must be NULLABLE");

    // 4. file_name column
    const fileNameCol = columns.get("file_name")!;
    assert.equal(fileNameCol.data_type, "character varying", "file_name should be character varying");
    assert.equal(fileNameCol.character_maximum_length, 255, "file_name max length should be 255");
    assert.equal(fileNameCol.is_nullable, "NO", "file_name must be NOT NULL");

    // 5. file_size column
    const fileSizeCol = columns.get("file_size")!;
    assert.equal(fileSizeCol.data_type, "integer", "file_size should be integer");
    assert.equal(fileSizeCol.is_nullable, "NO", "file_size must be NOT NULL");

    // 6. mime_type column
    const mimeTypeCol = columns.get("mime_type")!;
    assert.equal(mimeTypeCol.data_type, "character varying", "mime_type should be character varying");
    assert.equal(mimeTypeCol.character_maximum_length, 100, "mime_type max length should be 100");
    assert.equal(mimeTypeCol.is_nullable, "NO", "mime_type must be NOT NULL");

    // 7. status column
    const statusCol = columns.get("status")!;
    assert.equal(statusCol.data_type, "character varying", "status should be character varying");
    assert.equal(statusCol.character_maximum_length, 50, "status max length should be 50");
    assert.equal(statusCol.is_nullable, "NO", "status must be NOT NULL");
    assert.ok(
      statusCol.column_default && statusCol.column_default.includes("UPLOADED"),
      "status must default to 'UPLOADED'"
    );

    // 8. raw_text column
    const rawTextCol = columns.get("raw_text")!;
    assert.equal(rawTextCol.data_type, "text", "raw_text should be TEXT");
    assert.equal(rawTextCol.is_nullable, "YES", "raw_text must be NULLABLE");

    // 9. parsed_data column
    const parsedDataCol = columns.get("parsed_data")!;
    assert.equal(parsedDataCol.data_type, "jsonb", "parsed_data should be JSONB");
    assert.ok(
      parsedDataCol.column_default && parsedDataCol.column_default.includes("{}"),
      "parsed_data must default to '{}'::jsonb"
    );

    // 10. error_message column
    const errorMsgCol = columns.get("error_message")!;
    assert.equal(errorMsgCol.data_type, "text", "error_message should be TEXT");
    assert.equal(errorMsgCol.is_nullable, "YES", "error_message must be NULLABLE");

    // 11. created_at column
    const createdAtCol = columns.get("created_at")!;
    assert.equal(createdAtCol.data_type, "timestamp with time zone", "created_at should be TIMESTAMPTZ");
    assert.ok(
      createdAtCol.column_default &&
        (createdAtCol.column_default.includes("CURRENT_TIMESTAMP") ||
          createdAtCol.column_default.includes("now")),
      "created_at must have CURRENT_TIMESTAMP default"
    );

    // 12. updated_at column
    const updatedAtCol = columns.get("updated_at")!;
    assert.equal(updatedAtCol.data_type, "timestamp with time zone", "updated_at should be TIMESTAMPTZ");
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
         AND tc.table_name = 'cv_uploads'
         AND tc.table_schema = 'public'`
    );
    assert.equal(res.rows[0]!.column_name, "id");
  });

  await t.test("4. foreign key constraints link to users (CASCADE) and portfolios (SET NULL)", async () => {
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
         AND tc.table_name = 'cv_uploads'`
    );

    assert.ok(res.rows.length >= 2, "Expected at least 2 foreign key constraints on cv_uploads");

    // user_id FK check
    const userFk = res.rows.find((r) => r.column_name === "user_id");
    assert.ok(userFk, "Foreign key must exist on user_id column");
    assert.equal(userFk.foreign_table_name, "users", "user_id target table must be users");
    assert.equal(userFk.foreign_column_name, "id", "user_id target column must be id");
    assert.equal(userFk.delete_rule, "CASCADE", "user_id delete rule must be CASCADE");

    // portfolio_id FK check
    const portfolioFk = res.rows.find((r) => r.column_name === "portfolio_id");
    assert.ok(portfolioFk, "Foreign key must exist on portfolio_id column");
    assert.equal(portfolioFk.foreign_table_name, "portfolios", "portfolio_id target table must be portfolios");
    assert.equal(portfolioFk.foreign_column_name, "id", "portfolio_id target column must be id");
    assert.equal(portfolioFk.delete_rule, "SET NULL", "portfolio_id delete rule must be SET NULL");
  });

  await t.test("5. indexes exist on user_id and portfolio_id columns", async () => {
    const res = await pool.query<{ indexname: string; indexdef: string }>(
      `SELECT indexname, indexdef
       FROM pg_indexes
       WHERE schemaname = 'public'
         AND tablename = 'cv_uploads'
         AND indexname IN ('idx_cv_uploads_user_id', 'idx_cv_uploads_portfolio_id')`
    );

    assert.equal(res.rows.length, 2, "Both indexes must exist on cv_uploads");
    const userIdx = res.rows.find((r) => r.indexname === "idx_cv_uploads_user_id");
    const portfolioIdx = res.rows.find((r) => r.indexname === "idx_cv_uploads_portfolio_id");

    assert.ok(userIdx && userIdx.indexdef.includes("user_id"), "idx_cv_uploads_user_id must reference user_id");
    assert.ok(
      portfolioIdx && portfolioIdx.indexdef.includes("portfolio_id"),
      "idx_cv_uploads_portfolio_id must reference portfolio_id"
    );
  });

  await t.test("6. inserting valid record with defaults succeeds and returns expected defaults", async () => {
    // 1. Create user
    const userRes = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["CV Tester", testUserEmail, "dummy_pw"]
    );
    testUserId = userRes.rows[0]!.id;

    // 2. Insert cv_upload without optional fields (testing defaults)
    const cvRes = await pool.query<{
      id: string;
      user_id: string;
      portfolio_id: string | null;
      file_name: string;
      file_size: number;
      mime_type: string;
      status: string;
      raw_text: string | null;
      parsed_data: Record<string, unknown>;
      error_message: string | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO cv_uploads (
         user_id, file_name, file_size, mime_type
       )
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [testUserId, "developer_resume.pdf", 102400, "application/pdf"]
    );

    const inserted = cvRes.rows[0]!;
    assert.ok(inserted.id, "Generated UUID id must be present");
    createdCvUploadIds.push(inserted.id);

    assert.equal(inserted.user_id, testUserId);
    assert.equal(inserted.portfolio_id, null, "portfolio_id defaults to null");
    assert.equal(inserted.file_name, "developer_resume.pdf");
    assert.equal(inserted.file_size, 102400);
    assert.equal(inserted.mime_type, "application/pdf");
    assert.equal(inserted.status, "UPLOADED", "status defaults to 'UPLOADED'");
    assert.equal(inserted.raw_text, null);
    assert.deepEqual(inserted.parsed_data, {}, "parsed_data defaults to empty JSON object");
    assert.equal(inserted.error_message, null);
    assert.ok(inserted.created_at instanceof Date);
    assert.ok(inserted.updated_at instanceof Date);
  });

  await t.test("7. status CHECK constraint allows valid statuses and rejects invalid ones", async () => {
    assert.ok(testUserId, "Test user must exist");

    // All valid statuses: UPLOADED, PROCESSING, COMPLETED, FAILED
    const validStatuses = ["UPLOADED", "PROCESSING", "COMPLETED", "FAILED"];
    for (const validStatus of validStatuses) {
      const statusRes = await pool.query<{ id: string; status: string }>(
        `INSERT INTO cv_uploads (
           user_id, file_name, file_size, mime_type, status
         )
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, status`,
        [testUserId, `test_${validStatus.toLowerCase()}.pdf`, 2048, "application/pdf", validStatus]
      );
      assert.equal(statusRes.rows[0]!.status, validStatus);
      createdCvUploadIds.push(statusRes.rows[0]!.id);
    }

    // Invalid status should trigger check constraint violation
    await assert.rejects(
      async () => {
        await pool.query(
          `INSERT INTO cv_uploads (
             user_id, file_name, file_size, mime_type, status
           )
           VALUES ($1, $2, $3, $4, $5)`,
          [testUserId, "invalid.pdf", 1000, "application/pdf", "INVALID_STATUS"]
        );
      },
      /check constraint/i,
      "Expected check constraint error when inserting invalid status"
    );
  });

  await t.test("8. deleting referenced user cascades deletion of cv_uploads", async () => {
    // Create isolated user
    const tempUserRes = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["Cascade User", `cv_cascade_${uniqueTag}@foliocraft.test`, "pw"]
    );
    const tempUserId = tempUserRes.rows[0]!.id;

    // Create cv_upload under temp user
    const tempCvRes = await pool.query<{ id: string }>(
      `INSERT INTO cv_uploads (user_id, file_name, file_size, mime_type)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [tempUserId, "cv_to_cascade.pdf", 5000, "application/pdf"]
    );
    const tempCvId = tempCvRes.rows[0]!.id;

    // Delete temp user
    await pool.query("DELETE FROM users WHERE id = $1", [tempUserId]);

    // Verify cv_upload was cascade deleted
    const checkRes = await pool.query(
      "SELECT id FROM cv_uploads WHERE id = $1",
      [tempCvId]
    );
    assert.equal(checkRes.rows.length, 0, "cv_uploads record must be deleted when user is deleted");
  });

  await t.test("9. deleting referenced portfolio sets portfolio_id to NULL (ON DELETE SET NULL)", async () => {
    assert.ok(testUserId, "Test user must exist");

    // Create a portfolio
    const tempPortRes = await pool.query<{ id: string }>(
      `INSERT INTO portfolios (user_id, name, title, username)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [testUserId, "CV Test Portfolio", "Engineer", `cvport_${uniqueTag}`]
    );
    const tempPortId = tempPortRes.rows[0]!.id;

    // Insert cv_upload linked to this portfolio
    const cvWithPortRes = await pool.query<{ id: string; portfolio_id: string }>(
      `INSERT INTO cv_uploads (
         user_id, portfolio_id, file_name, file_size, mime_type
       )
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, portfolio_id`,
      [testUserId, tempPortId, "linked_cv.pdf", 12345, "application/pdf"]
    );
    const cvId = cvWithPortRes.rows[0]!.id;
    createdCvUploadIds.push(cvId);
    assert.equal(cvWithPortRes.rows[0]!.portfolio_id, tempPortId);

    // Delete portfolio
    await pool.query("DELETE FROM portfolios WHERE id = $1", [tempPortId]);

    // Verify cv_upload still exists, but portfolio_id is now NULL
    const checkRes = await pool.query<{ id: string; portfolio_id: string | null }>(
      "SELECT id, portfolio_id FROM cv_uploads WHERE id = $1",
      [cvId]
    );
    assert.equal(checkRes.rows.length, 1, "cv_uploads record must remain after portfolio is deleted");
    assert.equal(checkRes.rows[0]!.portfolio_id, null, "portfolio_id must be SET NULL when portfolio is deleted");
  });
});

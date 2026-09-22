import test from "node:test";
import assert from "node:assert/strict";
import { pool } from "../config/database";

test("PROJECT-01: Database Schema & Migration Verification Suite", async (t) => {
  const uniqueTag = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const testUserEmail = `proj_schema_${uniqueTag}@foliocraft.test`;
  let testUserId: string | null = null;
  let testPortfolioId: string | null = null;
  let testProjectId: string | null = null;

  t.after(async () => {
    try {
      if (testProjectId) {
        await pool.query("DELETE FROM projects WHERE id = $1", [testProjectId]);
      }
      if (testPortfolioId) {
        await pool.query("DELETE FROM portfolios WHERE id = $1", [testPortfolioId]);
      }
      if (testUserId) {
        await pool.query("DELETE FROM users WHERE id = $1", [testUserId]);
      }
    } catch (e) {
      console.error("Cleanup error in project.schema.test.ts:", e);
    }
  });

  await t.test("1. projects table exists in the public schema", async () => {
    const res = await pool.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_name = 'projects'`
    );
    assert.equal(res.rows.length, 1, "Expected projects table to exist in public schema");
  });

  await t.test("2. projects table has all required columns with expected data types", async () => {
    const res = await pool.query(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = 'projects'`
    );
    const columns = new Map(res.rows.map((row) => [row.column_name, row]));

    const expectedCols = [
      "id",
      "portfolio_id",
      "title",
      "description",
      "technologies",
      "github_url",
      "project_url",
      "image_url",
      "order_index",
      "created_at",
      "updated_at",
    ];

    for (const col of expectedCols) {
      assert.ok(columns.has(col), `Column ${col} must exist on projects table`);
    }

    const idCol = columns.get("id");
    assert.equal(idCol.data_type, "uuid", "id should be UUID");
    assert.equal(idCol.is_nullable, "NO", "id must be NOT NULL");

    const portfolioIdCol = columns.get("portfolio_id");
    assert.equal(portfolioIdCol.data_type, "uuid", "portfolio_id should be UUID");
    assert.equal(portfolioIdCol.is_nullable, "NO", "portfolio_id must be NOT NULL");

    const titleCol = columns.get("title");
    assert.equal(titleCol.data_type, "character varying", "title should be VARCHAR");
    assert.equal(titleCol.is_nullable, "NO", "title must be NOT NULL");

    const descCol = columns.get("description");
    assert.equal(descCol.data_type, "text", "description should be TEXT");
    assert.equal(descCol.is_nullable, "YES", "description can be NULL");

    const techCol = columns.get("technologies");
    assert.equal(techCol.data_type, "jsonb", "technologies should be JSONB");
    assert.equal(techCol.is_nullable, "YES", "technologies can be nullable/default");

    const ghCol = columns.get("github_url");
    assert.equal(ghCol.data_type, "text", "github_url should be TEXT");
    assert.equal(ghCol.is_nullable, "YES", "github_url can be NULL");

    const projUrlCol = columns.get("project_url");
    assert.equal(projUrlCol.data_type, "text", "project_url should be TEXT");
    assert.equal(projUrlCol.is_nullable, "YES", "project_url can be NULL");

    const imgCol = columns.get("image_url");
    assert.equal(imgCol.data_type, "text", "image_url should be TEXT");
    assert.equal(imgCol.is_nullable, "YES", "image_url can be NULL");

    const orderCol = columns.get("order_index");
    assert.equal(orderCol.data_type, "integer", "order_index should be integer");
    assert.equal(orderCol.is_nullable, "NO", "order_index must be NOT NULL");

    const createdAtCol = columns.get("created_at");
    assert.equal(createdAtCol.data_type, "timestamp with time zone", "created_at should be TIMESTAMPTZ");

    const updatedAtCol = columns.get("updated_at");
    assert.equal(updatedAtCol.data_type, "timestamp with time zone", "updated_at should be TIMESTAMPTZ");
  });

  await t.test("3. primary key is configured on id column", async () => {
    const res = await pool.query(
      `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
       WHERE tc.constraint_type = 'PRIMARY KEY'
         AND tc.table_name = 'projects'
         AND tc.table_schema = 'public'`
    );
    assert.equal(res.rows.length, 1);
    assert.equal(res.rows[0].column_name, "id");
  });

  await t.test("4. foreign key constraint links projects.portfolio_id to portfolios.id with ON DELETE CASCADE", async () => {
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
         AND tc.table_name = 'projects'`
    );

    assert.ok(res.rows.length >= 1, "Foreign key constraint must exist on projects table");
    const fk = res.rows.find((r) => r.column_name === "portfolio_id");
    assert.ok(fk, "Foreign key must be on portfolio_id column");
    assert.equal(fk.foreign_table_name, "portfolios");
    assert.equal(fk.foreign_column_name, "id");
    assert.equal(fk.delete_rule, "CASCADE");
  });

  await t.test("5. index exists on portfolio_id column", async () => {
    const res = await pool.query(
      `SELECT indexname, indexdef
       FROM pg_indexes
       WHERE schemaname = 'public'
         AND tablename = 'projects'
         AND indexname = 'idx_projects_portfolio_id'`
    );
    assert.equal(res.rows.length, 1, "Index idx_projects_portfolio_id must exist");
  });

  await t.test("6. insert project succeeds with all fields, JSONB technologies array, and default order_index", async () => {
    // 1. Create a user
    const userRes = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["Project Tester", testUserEmail, "dummy_pw"]
    );
    testUserId = userRes.rows[0].id;

    // 2. Create a portfolio
    const portRes = await pool.query(
      `INSERT INTO portfolios (user_id, name, title, username)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [testUserId, "Project Owner", "Senior Engineer", `projuser_${uniqueTag}`]
    );
    testPortfolioId = portRes.rows[0].id;

    // 3. Insert project
    const technologies = ["React", "TypeScript", "PostgreSQL", "TailwindCSS"];
    const projRes = await pool.query(
      `INSERT INTO projects (
         portfolio_id, title, description, technologies,
         github_url, project_url, image_url, order_index
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        testPortfolioId,
        "FolioCraft Platform",
        "A full-stack portfolio builder for developers.",
        JSON.stringify(technologies),
        "https://github.com/foliocraft/foliocraft",
        "https://foliocraft.dev",
        "https://images.unsplash.com/photo-1555066931-4365d14bab8c",
        1,
      ]
    );

    assert.equal(projRes.rows.length, 1);
    const created = projRes.rows[0];
    testProjectId = created.id;

    assert.equal(created.portfolio_id, testPortfolioId);
    assert.equal(created.title, "FolioCraft Platform");
    assert.equal(created.description, "A full-stack portfolio builder for developers.");
    assert.deepEqual(created.technologies, technologies);
    assert.equal(created.github_url, "https://github.com/foliocraft/foliocraft");
    assert.equal(created.project_url, "https://foliocraft.dev");
    assert.equal(created.image_url, "https://images.unsplash.com/photo-1555066931-4365d14bab8c");
    assert.equal(created.order_index, 1);
    assert.ok(created.created_at instanceof Date);
    assert.ok(created.updated_at instanceof Date);
  });

  await t.test("7. inserting project with minimal fields receives default order_index 0 and empty technologies", async () => {
    assert.ok(testPortfolioId);
    const projRes = await pool.query(
      `INSERT INTO projects (portfolio_id, title)
       VALUES ($1, $2)
       RETURNING *`,
      [testPortfolioId, "Minimal Project"]
    );

    assert.equal(projRes.rows.length, 1);
    const created = projRes.rows[0];

    assert.equal(created.order_index, 0, "Default order_index should be 0");
    assert.deepEqual(created.technologies, [], "Default technologies should be empty JSONB array");
    assert.equal(created.description, null);
    assert.equal(created.github_url, null);
    assert.equal(created.project_url, null);
    assert.equal(created.image_url, null);

    // Clean up minimal project
    await pool.query("DELETE FROM projects WHERE id = $1", [created.id]);
  });

  await t.test("8. ON DELETE CASCADE removes projects when parent portfolio is deleted", async () => {
    assert.ok(testPortfolioId);
    assert.ok(testProjectId);

    // Delete portfolio
    await pool.query("DELETE FROM portfolios WHERE id = $1", [testPortfolioId]);

    // Check project was deleted via CASCADE
    const checkProject = await pool.query("SELECT id FROM projects WHERE id = $1", [testProjectId]);
    assert.equal(checkProject.rows.length, 0, "Project should be automatically removed via ON DELETE CASCADE from portfolio");

    testPortfolioId = null;
    testProjectId = null;
  });
});

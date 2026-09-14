import test from "node:test";
import assert from "node:assert/strict";
import { pool } from "../config/database";

test("PORTFOLIO-01: Database Schema & Migration Verification Suite", async (t) => {
  const uniqueTag = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const testUserEmail = `schema_test_${uniqueTag}@foliocraft.test`;
  let testUserId: string | null = null;
  let testPortfolioId: string | null = null;

  t.after(async () => {
    try {
      if (testPortfolioId) {
        await pool.query("DELETE FROM portfolios WHERE id = $1", [testPortfolioId]);
      }
      if (testUserId) {
        await pool.query("DELETE FROM users WHERE id = $1", [testUserId]);
      }
    } catch (e) {
      console.error("Cleanup error in portfolio.schema.test.ts:", e);
    }
  });

  await t.test("1. portfolios table exists in the public schema", async () => {
    const res = await pool.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_name = 'portfolios'`
    );
    assert.equal(res.rows.length, 1, "Expected portfolios table to exist in public schema");
  });

  await t.test("2. portfolios table has all required columns with expected data types", async () => {
    const res = await pool.query(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = 'portfolios'`
    );
    const columns = new Map(res.rows.map((row) => [row.column_name, row]));

    // Required columns according to finalized database design
    const expectedCols = [
      "id",
      "user_id",
      "name",
      "email",
      "phone",
      "location",
      "title",
      "about",
      "profile_image_url",
      "social_links",
      "username",
      "template",
      "published",
      "created_at",
      "updated_at",
    ];

    for (const col of expectedCols) {
      assert.ok(columns.has(col), `Column ${col} must exist on portfolios table`);
    }

    // Verify types and nullability
    const idCol = columns.get("id");
    assert.equal(idCol.data_type, "uuid", "id should be UUID");
    assert.equal(idCol.is_nullable, "NO", "id must be NOT NULL");

    const userIdCol = columns.get("user_id");
    assert.equal(userIdCol.data_type, "uuid", "user_id should be UUID");
    assert.equal(userIdCol.is_nullable, "NO", "user_id must be NOT NULL");

    const nameCol = columns.get("name");
    assert.equal(nameCol.data_type, "character varying", "name should be VARCHAR");
    assert.equal(nameCol.is_nullable, "NO", "name must be NOT NULL");

    const emailCol = columns.get("email");
    assert.equal(emailCol.data_type, "character varying", "email should be VARCHAR");
    assert.equal(emailCol.is_nullable, "YES", "email can be NULL");

    const phoneCol = columns.get("phone");
    assert.equal(phoneCol.data_type, "character varying", "phone should be VARCHAR");
    assert.equal(phoneCol.is_nullable, "YES", "phone can be NULL");

    const locationCol = columns.get("location");
    assert.equal(locationCol.data_type, "character varying", "location should be VARCHAR");
    assert.equal(locationCol.is_nullable, "YES", "location can be NULL");

    const titleCol = columns.get("title");
    assert.equal(titleCol.data_type, "character varying", "title should be VARCHAR");
    assert.equal(titleCol.is_nullable, "NO", "title must be NOT NULL");

    const aboutCol = columns.get("about");
    assert.equal(aboutCol.data_type, "text", "about should be TEXT");
    assert.equal(aboutCol.is_nullable, "YES", "about can be NULL");

    const profileImageUrlCol = columns.get("profile_image_url");
    assert.equal(profileImageUrlCol.data_type, "text", "profile_image_url should be TEXT");
    assert.equal(profileImageUrlCol.is_nullable, "YES", "profile_image_url can be NULL");

    const socialLinksCol = columns.get("social_links");
    assert.equal(socialLinksCol.data_type, "jsonb", "social_links should be JSONB");
    assert.equal(socialLinksCol.is_nullable, "YES", "social_links can be NULL or default");

    const usernameCol = columns.get("username");
    assert.equal(usernameCol.data_type, "character varying", "username should be VARCHAR");
    assert.equal(usernameCol.is_nullable, "NO", "username must be NOT NULL");

    const templateCol = columns.get("template");
    assert.equal(templateCol.data_type, "character varying", "template should be VARCHAR");

    const publishedCol = columns.get("published");
    assert.equal(publishedCol.data_type, "boolean", "published should be boolean");

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
         AND tc.table_name = 'portfolios'
         AND tc.table_schema = 'public'`
    );
    assert.equal(res.rows.length, 1);
    assert.equal(res.rows[0].column_name, "id");
  });

  await t.test("4. foreign key constraint links portfolios.user_id to users.id with CASCADE", async () => {
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
         AND tc.table_name = 'portfolios'`
    );

    assert.ok(res.rows.length >= 1, "Foreign key constraint must exist");
    const fk = res.rows.find((r) => r.column_name === "user_id");
    assert.ok(fk, "Foreign key must be on user_id column");
    assert.equal(fk.foreign_table_name, "users");
    assert.equal(fk.foreign_column_name, "id");
    assert.equal(fk.delete_rule, "CASCADE");
  });

  await t.test("5. username has UNIQUE constraint configured", async () => {
    const res = await pool.query(
      `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
       WHERE tc.constraint_type = 'UNIQUE'
         AND tc.table_name = 'portfolios'
         AND tc.table_schema = 'public'`
    );
    const uniqueCols = res.rows.map((r) => r.column_name);
    assert.ok(uniqueCols.includes("username"), "Expected portfolios table to have UNIQUE constraint on username");
  });

  await t.test("6. insert portfolio with all basic info fields succeeds with JSONB social_links", async () => {
    // Create a test user
    const userInsert = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["Portfolio Schema Tester", testUserEmail, "hashed_pw_dummy"]
    );
    testUserId = userInsert.rows[0].id;
    assert.ok(testUserId, "Test user ID must be generated");

    const socialLinks = {
      github: "https://github.com/alexchen",
      linkedin: "https://linkedin.com/in/alexchen",
      twitter: "https://twitter.com/alexchen",
    };

    // Insert portfolio for this user with all basic info fields
    const portfolioInsert = await pool.query(
      `INSERT INTO portfolios (
         user_id, name, email, phone, location, title, about,
         profile_image_url, social_links, username, template, published
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        testUserId,
        "Alex Chen",
        "alex.portfolio@example.com",
        "+1 (555) 234-5678",
        "San Francisco, CA",
        "Senior Cloud Engineer",
        "Passionate about cloud-native systems and modern architectures.",
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
        JSON.stringify(socialLinks),
        `alex_${uniqueTag}`,
        "modern",
        false,
      ]
    );

    assert.equal(portfolioInsert.rows.length, 1);
    const created = portfolioInsert.rows[0];
    testPortfolioId = created.id;

    assert.equal(created.user_id, testUserId);
    assert.equal(created.name, "Alex Chen");
    assert.equal(created.email, "alex.portfolio@example.com");
    assert.equal(created.phone, "+1 (555) 234-5678");
    assert.equal(created.location, "San Francisco, CA");
    assert.equal(created.title, "Senior Cloud Engineer");
    assert.equal(created.about, "Passionate about cloud-native systems and modern architectures.");
    assert.equal(
      created.profile_image_url,
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"
    );
    assert.deepEqual(created.social_links, socialLinks);
    assert.equal(created.username, `alex_${uniqueTag}`);
    assert.equal(created.template, "modern");
    assert.equal(created.published, false);
    assert.ok(created.created_at instanceof Date);
    assert.ok(created.updated_at instanceof Date);
  });

  await t.test("7. duplicate username is rejected at the database level by UNIQUE constraint", async () => {
    assert.ok(testUserId);
    const duplicateUsername = `alex_${uniqueTag}`;

    let duplicateError: { code?: string } | null = null;
    try {
      await pool.query(
        `INSERT INTO portfolios (user_id, name, title, username)
         VALUES ($1, $2, $3, $4)`,
        [testUserId, "Another Alex", "Tech Lead", duplicateUsername]
      );
    } catch (err: unknown) {
      duplicateError = err as { code?: string };
    }

    assert.ok(duplicateError, "Expected duplicate username insert to throw error");
    // PostgreSQL error code 23505 is unique_violation
    assert.equal(duplicateError.code, "23505", "Expected PostgreSQL error code 23505 (unique_violation)");
  });

  await t.test("8. ON DELETE CASCADE removes portfolio when user is deleted", async () => {
    assert.ok(testUserId);
    assert.ok(testPortfolioId);

    // Delete user
    await pool.query("DELETE FROM users WHERE id = $1", [testUserId]);

    // Check if portfolio still exists
    const checkPortfolio = await pool.query("SELECT id FROM portfolios WHERE id = $1", [testPortfolioId]);
    assert.equal(checkPortfolio.rows.length, 0, "Portfolio should be automatically removed via ON DELETE CASCADE");

    // Clear variables so t.after doesn't error
    testUserId = null;
    testPortfolioId = null;
  });
});


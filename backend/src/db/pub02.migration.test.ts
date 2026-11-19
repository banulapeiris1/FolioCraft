import test from "node:test";
import assert from "node:assert/strict";
import { pool } from "../config/database";
import { runPub02Migration, rollbackPub02Migration } from "./migrate-pub02";

test("PUB-02: Database Indexing & Migration Verification Suite", async (t) => {
  const uniqueTag = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let testUserId: string | null = null;
  const createdPortfolioIds: string[] = [];

  t.before(async () => {
    // Ensure migration is in place
    await runPub02Migration();

    // Create a test user for DB constraint tests
    const userRes = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["Migration Tester", `mig_test_${uniqueTag}@foliocraft.test`, "hashed_pw"]
    );
    testUserId = userRes.rows[0].id;
  });

  t.after(async () => {
    try {
      for (const id of createdPortfolioIds) {
        await pool.query("DELETE FROM portfolios WHERE id = $1", [id]);
      }
      if (testUserId) {
        await pool.query("DELETE FROM users WHERE id = $1", [testUserId]);
      }
      // Re-apply migration to ensure DB stays ready for the application
      await runPub02Migration();
    } catch (e) {
      console.error("Cleanup error in pub02.migration.test.ts:", e);
    }
  });

  await t.test("1. published_at column exists in portfolios table", async () => {
    const res = await pool.query<{ column_name: string; data_type: string }>(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'portfolios' AND column_name = 'published_at'`
    );
    assert.equal(res.rows.length, 1, "published_at column should exist");
    assert.equal(
      res.rows[0].data_type,
      "timestamp with time zone",
      "published_at should be TIMESTAMPTZ"
    );
  });

  await t.test(
    "2. idx_portfolios_username_lower unique index exists on portfolios",
    async () => {
      const res = await pool.query<{ indexname: string; indexdef: string }>(
        `SELECT indexname, indexdef
         FROM pg_indexes
         WHERE tablename = 'portfolios' AND indexname = 'idx_portfolios_username_lower'`
      );
      assert.equal(res.rows.length, 1, "idx_portfolios_username_lower index should exist");
      assert.ok(
        res.rows[0].indexdef.includes("UNIQUE"),
        "Index must be UNIQUE"
      );
      assert.ok(
        res.rows[0].indexdef.toLowerCase().includes("lower"),
        "Index must use lower function"
      );
    }
  );

  await t.test(
    "3. idx_portfolios_public_lookup composite index exists on portfolios",
    async () => {
      const res = await pool.query<{ indexname: string; indexdef: string }>(
        `SELECT indexname, indexdef
         FROM pg_indexes
         WHERE tablename = 'portfolios' AND indexname = 'idx_portfolios_public_lookup'`
      );
      assert.equal(res.rows.length, 1, "idx_portfolios_public_lookup index should exist");
      assert.ok(
        res.rows[0].indexdef.includes("published"),
        "Index must include published column"
      );
    }
  );

  await t.test(
    "4. Case-variant duplicate usernames are rejected by idx_portfolios_username_lower",
    async () => {
      assert.ok(testUserId);
      const baseUsername = `pubtest_${uniqueTag}`;

      // Insert first with lowercase
      const first = await pool.query<{ id: string }>(
        `INSERT INTO portfolios (user_id, name, title, username, published)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [testUserId, "First User", "Engineer", baseUsername.toLowerCase(), true]
      );
      createdPortfolioIds.push(first.rows[0].id);

      // Attempt to insert with uppercase variant
      let duplicateError: { code?: string } | null = null;
      try {
        await pool.query(
          `INSERT INTO portfolios (user_id, name, title, username, published)
           VALUES ($1, $2, $3, $4, $5)`,
          [testUserId, "Second User", "Designer", baseUsername.toUpperCase(), true]
        );
      } catch (err: unknown) {
        duplicateError = err as { code?: string };
      }

      assert.ok(
        duplicateError,
        "Inserting uppercase variant of existing username should be rejected"
      );
      assert.equal(
        duplicateError.code,
        "23505",
        "Error code should be 23505 (unique_violation)"
      );
    }
  );

  await t.test(
    "5. Database migration rollback and re-apply completes cleanly",
    async () => {
      // PUB-06: The rollback script drops the published_at column. Running it
      // against the shared database would erase every real portfolio's
      // publication timestamp. PostgreSQL DDL is transactional, so the whole
      // rollback -> re-apply cycle runs on one client inside a transaction
      // that is always rolled back, leaving existing data untouched.
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        await rollbackPub02Migration(client);

        const checkRollback = await client.query<{ indexname: string }>(
          `SELECT indexname
           FROM pg_indexes
           WHERE tablename = 'portfolios' AND indexname IN ('idx_portfolios_username_lower', 'idx_portfolios_public_lookup')`
        );
        assert.equal(
          checkRollback.rows.length,
          0,
          "Indexes should be dropped after rollback"
        );

        const checkColumn = await client.query(
          `SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'portfolios' AND column_name = 'published_at'`
        );
        assert.equal(
          checkColumn.rows.length,
          0,
          "published_at column should be dropped after rollback"
        );

        // Re-apply migration
        await runPub02Migration(client);

        const checkReapply = await client.query<{ indexname: string }>(
          `SELECT indexname
           FROM pg_indexes
           WHERE tablename = 'portfolios' AND indexname IN ('idx_portfolios_username_lower', 'idx_portfolios_public_lookup')`
        );
        assert.equal(
          checkReapply.rows.length,
          2,
          "Both indexes should be recreated after re-running migration"
        );
      } finally {
        await client.query("ROLLBACK");
        client.release();
      }
    }
  );

  await t.test(
    "6. Rollback verification does not destroy existing published_at data (PUB-06 regression)",
    async () => {
      assert.ok(createdPortfolioIds.length > 0, "Test 4 should have created a portfolio");
      const portfolioId = createdPortfolioIds[0];
      const knownTimestamp = "2026-01-02T03:04:05.000Z";

      await pool.query(
        `UPDATE portfolios SET published_at = $1 WHERE id = $2`,
        [knownTimestamp, portfolioId]
      );

      // Same transactional rollback/re-apply cycle as test 5
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await rollbackPub02Migration(client);
        await runPub02Migration(client);
      } finally {
        await client.query("ROLLBACK");
        client.release();
      }

      const after = await pool.query<{ published_at: Date | null }>(
        `SELECT published_at FROM portfolios WHERE id = $1`,
        [portfolioId]
      );
      assert.ok(after.rows[0]?.published_at, "published_at must survive the rollback check");
      assert.equal(
        new Date(after.rows[0].published_at as Date).toISOString(),
        knownTimestamp,
        "published_at value must be unchanged"
      );
    }
  );
});


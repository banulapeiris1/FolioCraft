import test from "node:test";
import assert from "node:assert/strict";
import { pool } from "../config/database";
import {
  runAnimationStyleMigration,
  rollbackAnimationStyleMigration,
} from "./migrate-animation-style";

/**
 * Phase 14 (Stage 4): animation_style migration.
 * Destructive steps (rollback, constraint removal) only ever run inside a
 * transaction that is rolled back, so real portfolio data is never touched.
 */
test("Phase 14: animation_style migration suite", async (t) => {
  const uniqueTag = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let testUserId = "";
  const createdPortfolioIds: string[] = [];

  async function insertPortfolio(suffix: string, animationStyle?: string): Promise<string> {
    const columns = animationStyle ? ", animation_style" : "";
    const values = animationStyle ? ", $5" : "";
    const params = [testUserId, "Motion Tester", "Engineer", `anim_${suffix}_${uniqueTag}`];
    if (animationStyle) params.push(animationStyle);
    const res = await pool.query<{ id: string }>(
      `INSERT INTO portfolios (user_id, name, title, username${columns})
       VALUES ($1, $2, $3, $4${values}) RETURNING id`,
      params
    );
    createdPortfolioIds.push(res.rows[0]!.id);
    return res.rows[0]!.id;
  }

  t.before(async () => {
    await runAnimationStyleMigration();
    const userRes = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id`,
      ["Animation Migration Tester", `anim_mig_${uniqueTag}@foliocraft.test`, "hashed_pw"]
    );
    testUserId = userRes.rows[0]!.id;
  });

  t.after(async () => {
    try {
      for (const id of createdPortfolioIds) {
        await pool.query("DELETE FROM portfolios WHERE id = $1", [id]);
      }
      if (testUserId) await pool.query("DELETE FROM users WHERE id = $1", [testUserId]);
      await runAnimationStyleMigration();
    } catch (e) {
      console.error("Cleanup error in animationStyle.migration.test.ts:", e);
    }
  });

  await t.test("1. animation_style is VARCHAR(20) NOT NULL DEFAULT 'subtle'", async () => {
    const res = await pool.query<{
      data_type: string;
      character_maximum_length: number;
      is_nullable: string;
      column_default: string;
    }>(
      `SELECT data_type, character_maximum_length, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'portfolios' AND column_name = 'animation_style'`
    );
    assert.equal(res.rows.length, 1, "animation_style column should exist");
    const col = res.rows[0]!;
    assert.equal(col.data_type, "character varying");
    assert.equal(col.character_maximum_length, 20);
    assert.equal(col.is_nullable, "NO");
    assert.match(col.column_default, /'subtle'/);
  });

  await t.test("2. New portfolios default to 'subtle'", async () => {
    const id = await insertPortfolio("default");
    const res = await pool.query<{ animation_style: string }>(
      "SELECT animation_style FROM portfolios WHERE id = $1",
      [id]
    );
    assert.equal(res.rows[0]!.animation_style, "subtle");
  });

  await t.test("3. Every allowed value is accepted", async () => {
    for (const style of ["subtle", "creative", "minimal"]) {
      const id = await insertPortfolio(style, style);
      const res = await pool.query<{ animation_style: string }>(
        "SELECT animation_style FROM portfolios WHERE id = $1",
        [id]
      );
      assert.equal(res.rows[0]!.animation_style, style);
    }
  });

  await t.test("4. Unsupported values (including gallery-only 'none') are rejected by the database", async () => {
    for (const [i, bad] of ["none", "CREATIVE", "bouncy", " subtle"].entries()) {
      await assert.rejects(
        () => insertPortfolio(`bad${i}`, bad),
        (err: { code?: string }) => err.code === "23514",
        `'${bad}' should violate portfolios_animation_style_check`
      );
    }
    const nullRes = await pool
      .query(
        `INSERT INTO portfolios (user_id, name, title, username, animation_style)
         VALUES ($1, 'N', 'T', $2, NULL)`,
        [testUserId, `anim_null_${uniqueTag}`]
      )
      .catch((err: { code?: string }) => err);
    assert.equal((nullRes as { code?: string }).code, "23502", "NULL should violate NOT NULL");
  });

  await t.test("5. Re-running the migration is idempotent and preserves saved styles", async () => {
    const id = await insertPortfolio("keep", "creative");
    await runAnimationStyleMigration();
    await runAnimationStyleMigration();
    const res = await pool.query<{ animation_style: string }>(
      "SELECT animation_style FROM portfolios WHERE id = $1",
      [id]
    );
    assert.equal(res.rows[0]!.animation_style, "creative");
  });

  await t.test("6. Migration repairs NULL and invalid values to 'subtle' (inside a rolled-back transaction)", async () => {
    const keepId = await insertPortfolio("repair_keep", "minimal");
    const brokenId = await insertPortfolio("repair_broken");
    const nullId = await insertPortfolio("repair_null");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // Simulate a column created earlier without constraints.
      await client.query("ALTER TABLE portfolios DROP CONSTRAINT portfolios_animation_style_check");
      await client.query("ALTER TABLE portfolios ALTER COLUMN animation_style DROP NOT NULL");
      await client.query("UPDATE portfolios SET animation_style = 'wobbly' WHERE id = $1", [brokenId]);
      await client.query("UPDATE portfolios SET animation_style = NULL WHERE id = $1", [nullId]);

      await runAnimationStyleMigration(client);

      const res = await client.query<{ id: string; animation_style: string }>(
        "SELECT id, animation_style FROM portfolios WHERE id = ANY($1::uuid[])",
        [[keepId, brokenId, nullId]]
      );
      const byId = new Map(res.rows.map((r) => [r.id, r.animation_style]));
      assert.equal(byId.get(keepId), "minimal", "valid value preserved");
      assert.equal(byId.get(brokenId), "subtle", "invalid value repaired");
      assert.equal(byId.get(nullId), "subtle", "NULL repaired");
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });

  await t.test("7. Rollback removes the column and constraint; re-apply restores them (rolled back)", async () => {
    const otherColumnsBefore = await pool.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'portfolios' AND column_name <> 'animation_style'`
    );
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await rollbackAnimationStyleMigration(client);

      const afterRollback = await client.query(
        `SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'portfolios' AND column_name = 'animation_style'`
      );
      assert.equal(afterRollback.rows.length, 0, "column dropped by rollback");
      const constraint = await client.query(
        "SELECT 1 FROM pg_constraint WHERE conname = 'portfolios_animation_style_check'"
      );
      assert.equal(constraint.rows.length, 0, "constraint dropped by rollback");
      const otherColumns = await client.query<{ n: number }>(
        `SELECT COUNT(*)::int AS n FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'portfolios'`
      );
      assert.equal(otherColumns.rows[0]!.n, otherColumnsBefore.rows[0]!.n, "no other column touched");

      // Rolling back twice is safe.
      await rollbackAnimationStyleMigration(client);

      await runAnimationStyleMigration(client);
      const reapplied = await client.query<{ is_nullable: string }>(
        `SELECT is_nullable FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'portfolios' AND column_name = 'animation_style'`
      );
      assert.equal(reapplied.rows.length, 1, "column restored");
      assert.equal(reapplied.rows[0]!.is_nullable, "NO");
      const nonDefault = await client.query<{ n: number }>(
        "SELECT COUNT(*)::int AS n FROM portfolios WHERE animation_style <> 'subtle'"
      );
      assert.equal(nonDefault.rows[0]!.n, 0, "re-applied column backfills every row with 'subtle'");
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }

    const stillThere = await pool.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'portfolios' AND column_name = 'animation_style'`
    );
    assert.equal(stillThere.rows.length, 1, "transaction rollback left the real schema intact");
  });
});

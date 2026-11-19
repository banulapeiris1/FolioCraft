import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../server";
import { pool } from "../config/database";
import { signToken } from "../utils/auth";
import { portfolioService } from "../services/portfolio.service";
import type { PortfolioListItem } from "../types/portfolio.types";

/**
 * DASH-03: read-only section counts on GET /api/portfolios.
 * Verifies counts are accurate, per-portfolio, owner-isolated, and that the
 * response stays backward compatible (existing fields untouched).
 */
test("DASH-03: Portfolio list section counts (GET /api/portfolios)", async (t) => {
  let server: Server;
  let baseUrl: string;

  const tag = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  let userAId = "";
  let userBId = "";
  let userCId = "";
  let userAJwt = "";
  let userCJwt = "";
  let fullPortfolioId = "";
  let emptyPortfolioId = "";
  let otherUserPortfolioId = "";

  t.before(async () => {
    server = app.listen(0);
    baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`;

    const insertUser = async (label: string) => {
      const r = await pool.query<{ id: string }>(
        `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id`,
        [`Dash ${label}`, `dash03_${label}_${tag}@foliocraft.test`, "hashed_dummy_pw"]
      );
      return r.rows[0]!.id;
    };
    userAId = await insertUser("a");
    userBId = await insertUser("b");
    userCId = await insertUser("c");
    userAJwt = signToken({ userId: userAId });
    userCJwt = signToken({ userId: userCId });

    const insertPortfolio = async (userId: string, username: string) => {
      const r = await pool.query<{ id: string }>(
        `INSERT INTO portfolios (user_id, name, title, username) VALUES ($1, $2, $3, $4) RETURNING id`,
        [userId, "Dash Tester", "Engineer", username]
      );
      return r.rows[0]!.id;
    };
    fullPortfolioId = await insertPortfolio(userAId, `dash03full_${tag}`);
    emptyPortfolioId = await insertPortfolio(userAId, `dash03empty_${tag}`);
    otherUserPortfolioId = await insertPortfolio(userBId, `dash03other_${tag}`);

    // Full portfolio: 3 projects, 2 skills, 1 experience entry
    for (let i = 0; i < 3; i++) {
      await pool.query(`INSERT INTO projects (portfolio_id, title) VALUES ($1, $2)`, [
        fullPortfolioId,
        `Project ${i}`,
      ]);
    }
    for (const name of ["TypeScript", "PostgreSQL"]) {
      await pool.query(`INSERT INTO skills (portfolio_id, name, category) VALUES ($1, $2, $3)`, [
        fullPortfolioId,
        name,
        "Languages",
      ]);
    }
    await pool.query(
      `INSERT INTO experience (portfolio_id, company, position, start_date) VALUES ($1, $2, $3, $4)`,
      [fullPortfolioId, "Acme", "Developer", "2024-01-01"]
    );

    // Another user's content must never be counted for user A
    for (let i = 0; i < 5; i++) {
      await pool.query(`INSERT INTO projects (portfolio_id, title) VALUES ($1, $2)`, [
        otherUserPortfolioId,
        `Other ${i}`,
      ]);
    }
  });

  t.after(async () => {
    server.close();
    try {
      // Child rows cascade with their portfolio
      for (const id of [fullPortfolioId, emptyPortfolioId, otherUserPortfolioId]) {
        if (id) await pool.query("DELETE FROM portfolios WHERE id = $1", [id]);
      }
      for (const id of [userAId, userBId, userCId]) {
        if (id) await pool.query("DELETE FROM users WHERE id = $1", [id]);
      }
    } catch (e) {
      console.error("Cleanup error in DASH-03 section count tests:", e);
    }
  });

  const fetchList = async (jwt: string) => {
    const res = await fetch(`${baseUrl}/api/portfolios`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    assert.equal(res.status, 200);
    return (await res.json()) as { success: boolean; portfolios: PortfolioListItem[] };
  };

  await t.test("1. Each portfolio in the list carries accurate numeric section counts", async () => {
    const body = await fetchList(userAJwt);
    assert.equal(body.portfolios.length, 2);

    const full = body.portfolios.find((p) => p.id === fullPortfolioId);
    const empty = body.portfolios.find((p) => p.id === emptyPortfolioId);
    assert.ok(full && empty);

    assert.deepEqual(full.sectionCounts, { projects: 3, skills: 2, experience: 1 });
    assert.deepEqual(empty.sectionCounts, { projects: 0, skills: 0, experience: 0 });
    for (const value of Object.values(full.sectionCounts)) {
      assert.equal(typeof value, "number", "counts must be JSON numbers, not bigint strings");
    }
  });

  await t.test("2. Counts are isolated per owner (other users' content is never counted)", async () => {
    const body = await fetchList(userAJwt);
    assert.ok(!body.portfolios.some((p) => p.id === otherUserPortfolioId));
    const totalProjects = body.portfolios.reduce((sum, p) => sum + p.sectionCounts.projects, 0);
    assert.equal(totalProjects, 3);
  });

  await t.test("3. Response remains backward compatible (existing fields and ordering intact)", async () => {
    const body = await fetchList(userAJwt);
    assert.equal(body.success, true);
    for (const p of body.portfolios) {
      for (const key of [
        "id", "userId", "name", "title", "username", "template",
        "published", "publishedAt", "createdAt", "updatedAt", "socialLinks",
      ]) {
        assert.ok(key in p, `missing existing field '${key}'`);
      }
      assert.equal(p.userId, userAId);
    }
    const t0 = new Date(body.portfolios[0]!.updatedAt).getTime();
    const t1 = new Date(body.portfolios[1]!.updatedAt).getTime();
    assert.ok(t0 >= t1, "ordering by updated_at DESC must be preserved");
  });

  await t.test("4. User with no portfolios still receives an empty list", async () => {
    const body = await fetchList(userCJwt);
    assert.deepEqual(body.portfolios, []);
  });

  await t.test("5. Counts are read-only: listing does not modify portfolios or updated_at", async () => {
    const before = await pool.query<{ updated_at: Date }>(
      "SELECT updated_at FROM portfolios WHERE id = $1",
      [fullPortfolioId]
    );
    await fetchList(userAJwt);
    const after = await pool.query<{ updated_at: Date }>(
      "SELECT updated_at FROM portfolios WHERE id = $1",
      [fullPortfolioId]
    );
    assert.equal(after.rows[0]!.updated_at.getTime(), before.rows[0]!.updated_at.getTime());
  });

  await t.test("6. Single-portfolio endpoint is unchanged (no sectionCounts added)", async () => {
    const res = await fetch(`${baseUrl}/api/portfolios/${fullPortfolioId}`, {
      headers: { Authorization: `Bearer ${userAJwt}` },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { portfolio: Record<string, unknown> };
    assert.equal(body.portfolio.id, fullPortfolioId);
    assert.ok(!("sectionCounts" in body.portfolio));
  });

  await t.test("7. Service rejects an invalid user id before querying", async () => {
    await assert.rejects(portfolioService.getPortfoliosByUserId("not-a-uuid"), /Invalid user ID/);
  });
});

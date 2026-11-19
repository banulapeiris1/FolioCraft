import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../server";
import { pool } from "../config/database";
import { signToken } from "../utils/auth";

/**
 * DASH-05: verifies the actual behaviour of DELETE /api/portfolios/:id that the
 * dashboard relies on. No backend code was changed for DASH-05; this suite
 * documents and guards the existing behaviour.
 */
test("DASH-05: Portfolio deletion behaviour (DELETE /api/portfolios/:id)", async (t) => {
  let server: Server;
  let baseUrl: string;

  const tag = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const username = `dash05live_${tag}`;
  let ownerId = "";
  let otherId = "";
  let ownerJwt = "";
  let otherJwt = "";
  let livePortfolioId = "";
  let cvUploadId = "";

  const count = async (table: "projects" | "skills" | "experience", portfolioId: string) => {
    const r = await pool.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM ${table} WHERE portfolio_id = $1`,
      [portfolioId]
    );
    return r.rows[0]!.n;
  };

  const del = (id: string, jwt?: string) =>
    fetch(`${baseUrl}/api/portfolios/${id}`, {
      method: "DELETE",
      headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
    });

  t.before(async () => {
    server = app.listen(0);
    baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`;

    const insertUser = async (label: string) => {
      const r = await pool.query<{ id: string }>(
        `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id`,
        [`Dash05 ${label}`, `dash05_${label}_${tag}@foliocraft.test`, "hashed_dummy_pw"]
      );
      return r.rows[0]!.id;
    };
    ownerId = await insertUser("owner");
    otherId = await insertUser("other");
    ownerJwt = signToken({ userId: ownerId });
    otherJwt = signToken({ userId: otherId });

    // A published portfolio with content and a linked CV upload
    const p = await pool.query<{ id: string }>(
      `INSERT INTO portfolios (user_id, name, title, username, published, published_at)
       VALUES ($1, $2, $3, $4, true, NOW()) RETURNING id`,
      [ownerId, "Dash Five", "Engineer", username]
    );
    livePortfolioId = p.rows[0]!.id;

    await pool.query(`INSERT INTO projects (portfolio_id, title) VALUES ($1, 'P1'), ($1, 'P2')`, [livePortfolioId]);
    await pool.query(`INSERT INTO skills (portfolio_id, name, category) VALUES ($1, 'Go', 'Languages')`, [livePortfolioId]);
    await pool.query(
      `INSERT INTO experience (portfolio_id, company, position, start_date) VALUES ($1, 'Acme', 'Dev', '2024-01-01')`,
      [livePortfolioId]
    );
    const cv = await pool.query<{ id: string }>(
      `INSERT INTO cv_uploads (user_id, portfolio_id, file_name, file_size, mime_type, status)
       VALUES ($1, $2, 'cv.pdf', 1024, 'application/pdf', 'COMPLETED') RETURNING id`,
      [ownerId, livePortfolioId]
    );
    cvUploadId = cv.rows[0]!.id;
  });

  t.after(async () => {
    server.close();
    try {
      await pool.query("DELETE FROM portfolios WHERE id = $1", [livePortfolioId]);
      // cv_uploads and any leftovers cascade from users
      for (const id of [ownerId, otherId]) {
        if (id) await pool.query("DELETE FROM users WHERE id = $1", [id]);
      }
    } catch (e) {
      console.error("Cleanup error in DASH-05 delete tests:", e);
    }
  });

  await t.test("1. Preconditions: the portfolio is live with content", async () => {
    const res = await fetch(`${baseUrl}/api/public/${username}`);
    assert.equal(res.status, 200);
    assert.equal(await count("projects", livePortfolioId), 2);
    assert.equal(await count("skills", livePortfolioId), 1);
    assert.equal(await count("experience", livePortfolioId), 1);
  });

  await t.test("2. Unauthenticated delete is rejected with 401", async () => {
    assert.equal((await del(livePortfolioId)).status, 401);
  });

  await t.test("3. Another user cannot delete it (403) and no content is touched", async () => {
    const res = await del(livePortfolioId, otherJwt);
    assert.equal(res.status, 403);
    const exists = await pool.query("SELECT 1 FROM portfolios WHERE id = $1", [livePortfolioId]);
    assert.equal(exists.rows.length, 1);
    assert.equal(await count("projects", livePortfolioId), 2);
    assert.equal(await count("skills", livePortfolioId), 1);
    assert.equal(await count("experience", livePortfolioId), 1);
  });

  await t.test("4. Owner deletes a live portfolio: 200 with { success, id }", async () => {
    const res = await del(livePortfolioId, ownerJwt);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { success: true, id: livePortfolioId });
  });

  await t.test("5. Deletion is permanent and cascades to projects, skills and experience", async () => {
    const exists = await pool.query("SELECT 1 FROM portfolios WHERE id = $1", [livePortfolioId]);
    assert.equal(exists.rows.length, 0, "hard delete, no soft-delete flag");
    assert.equal(await count("projects", livePortfolioId), 0);
    assert.equal(await count("skills", livePortfolioId), 0);
    assert.equal(await count("experience", livePortfolioId), 0);
  });

  await t.test("6. Linked CV upload records are kept and unlinked (ON DELETE SET NULL)", async () => {
    const r = await pool.query<{ portfolio_id: string | null; user_id: string }>(
      "SELECT portfolio_id, user_id FROM cv_uploads WHERE id = $1",
      [cvUploadId]
    );
    assert.equal(r.rows.length, 1, "CV upload row is retained");
    assert.equal(r.rows[0]!.portfolio_id, null);
    assert.equal(r.rows[0]!.user_id, ownerId);
  });

  await t.test("7. The public URL stops working immediately", async () => {
    const res = await fetch(`${baseUrl}/api/public/${username}`);
    assert.equal(res.status, 404);
  });

  await t.test("8. The username becomes available to other users", async () => {
    const res = await fetch(`${baseUrl}/api/portfolios/check-username/${username}`, {
      headers: { Authorization: `Bearer ${otherJwt}` },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { available: boolean };
    assert.equal(body.available, true);
  });

  await t.test("9. Repeating the delete returns 404 (dashboard treats it as already deleted)", async () => {
    assert.equal((await del(livePortfolioId, ownerJwt)).status, 404);
  });

  await t.test("10. The owner's list no longer contains it", async () => {
    const res = await fetch(`${baseUrl}/api/portfolios`, {
      headers: { Authorization: `Bearer ${ownerJwt}` },
    });
    const body = (await res.json()) as { portfolios: { id: string }[] };
    assert.ok(!body.portfolios.some((p) => p.id === livePortfolioId));
  });
});

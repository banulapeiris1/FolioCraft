import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../server";
import { pool } from "../config/database";
import { signToken } from "../utils/auth";

test("PUB-03: Publishing, Unpublishing & Username Management HTTP API Suite", async (t) => {
  let server: Server;
  let baseUrl: string;

  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  let user1Id = "";
  let user2Id = "";
  let user1Jwt = "";
  let user2Jwt = "";

  let portfolio1Id = "";
  let portfolio2Id = "";
  const createdPortfolioIds: string[] = [];

  const user1Username = `user1_${uniqueSuffix}`;
  const user2Username = `user2_${uniqueSuffix}`;

  t.before(async () => {
    server = app.listen(0);
    const address = server.address() as AddressInfo;
    baseUrl = `http://localhost:${address.port}`;

    // Create User 1
    const u1 = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["Publisher User 1", `pub1_${uniqueSuffix}@foliocraft.test`, "hashed_pw"]
    );
    user1Id = u1.rows[0].id;
    user1Jwt = signToken({ userId: user1Id });

    // Create User 2
    const u2 = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["Publisher User 2", `pub2_${uniqueSuffix}@foliocraft.test`, "hashed_pw"]
    );
    user2Id = u2.rows[0].id;
    user2Jwt = signToken({ userId: user2Id });

    // Create a portfolio for User 1
    const p1 = await pool.query<{ id: string }>(
      `INSERT INTO portfolios (user_id, name, title, about, username, template, published)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        user1Id,
        "Banula Peiris",
        "Full Stack Architect",
        "Passionate software engineer building resilient distributed systems.",
        user1Username,
        "modern",
        false,
      ]
    );
    portfolio1Id = p1.rows[0].id;
    createdPortfolioIds.push(portfolio1Id);

    // Add a project, skill, and experience to Portfolio 1
    await pool.query(
      `INSERT INTO projects (portfolio_id, title, description, technologies)
       VALUES ($1, $2, $3, $4)`,
      [
        portfolio1Id,
        "FolioCraft Platform",
        "Portfolio builder engine",
        JSON.stringify(["TypeScript", "React", "PostgreSQL"]),
      ]
    );

    await pool.query(
      `INSERT INTO skills (portfolio_id, name, category)
       VALUES ($1, $2, $3)`,
      [portfolio1Id, "PostgreSQL", "Database"]
    );

    await pool.query(
      `INSERT INTO experience (portfolio_id, company, position, start_date, is_current)
       VALUES ($1, $2, $3, $4, $5)`,
      [portfolio1Id, "Tech Corp", "Lead Architect", "2024-01-01", true]
    );

    // Create a portfolio for User 2
    const p2 = await pool.query<{ id: string }>(
      `INSERT INTO portfolios (user_id, name, title, username, template, published)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [user2Id, "Jane Doe", "Security Analyst", user2Username, "minimal", false]
    );
    portfolio2Id = p2.rows[0].id;
    createdPortfolioIds.push(portfolio2Id);
  });

  t.after(async () => {
    server.close();
    try {
      for (const id of createdPortfolioIds) {
        await pool.query("DELETE FROM portfolios WHERE id = $1", [id]);
      }
      if (user1Id) {
        await pool.query("DELETE FROM users WHERE id = $1", [user1Id]);
      }
      if (user2Id) {
        await pool.query("DELETE FROM users WHERE id = $1", [user2Id]);
      }
    } catch (e) {
      console.error("Cleanup error in publishing.routes.test.ts:", e);
    }
  });

  // ==========================================
  // SECTION A: Username Availability Tests
  // ==========================================

  await t.test("A1. Check username availability with valid available username returns available: true", async () => {
    const candidate = `avail_${uniqueSuffix}`;
    const res = await fetch(`${baseUrl}/api/portfolios/check-username/${candidate}`, {
      headers: { Authorization: `Bearer ${user1Jwt}` },
    });
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.available, true);
    assert.equal(body.username, candidate);
  });

  await t.test("A2. Check username availability with invalid format returns 400 Bad Request", async () => {
    const invalidCandidate = "invalid@user!name";
    const res = await fetch(
      `${baseUrl}/api/portfolios/check-username/${encodeURIComponent(invalidCandidate)}`,
      { headers: { Authorization: `Bearer ${user1Jwt}` } }
    );
    assert.equal(res.status, 400);

    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /alphanumeric/i);
  });

  await t.test("A3. Check username availability with system-reserved username returns 400 Bad Request", async () => {
    const reservedNames = ["admin", "api", "login", "dashboard", "u"];

    for (const name of reservedNames) {
      const res = await fetch(`${baseUrl}/api/portfolios/check-username/${name}`, {
        headers: { Authorization: `Bearer ${user1Jwt}` },
      });
      assert.equal(res.status, 400, `Expected 400 for reserved name '${name}'`);

      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /reserved/i);
    }
  });

  await t.test("A4. Check username availability enforces minimum (3) and maximum (50) lengths", async () => {
    // Under minimum length (< 3)
    const shortRes = await fetch(`${baseUrl}/api/portfolios/check-username/ab`, {
      headers: { Authorization: `Bearer ${user1Jwt}` },
    });
    assert.equal(shortRes.status, 400);
    const shortBody = await shortRes.json();
    assert.match(shortBody.message, /at least 3 characters/i);

    // Over maximum length (> 50)
    const longName = "a".repeat(55);
    const longRes = await fetch(`${baseUrl}/api/portfolios/check-username/${longName}`, {
      headers: { Authorization: `Bearer ${user1Jwt}` },
    });
    assert.equal(longRes.status, 400);
    const longBody = await longRes.json();
    assert.match(longBody.message, /cannot exceed 50/i);
  });

  await t.test("A5. Check username normalizes uppercase input to lowercase", async () => {
    const mixed = `AvAiL_${uniqueSuffix}`;
    const res = await fetch(`${baseUrl}/api/portfolios/check-username/${mixed}`, {
      headers: { Authorization: `Bearer ${user1Jwt}` },
    });
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.available, true);
    assert.equal(body.username, mixed.toLowerCase());
  });

  await t.test("A6. Case-insensitive duplicate check reports existing username as unavailable", async () => {
    // Check uppercase variant of User 2's username
    const upperOfUser2 = user2Username.toUpperCase();
    const res = await fetch(`${baseUrl}/api/portfolios/check-username/${upperOfUser2}`, {
      headers: { Authorization: `Bearer ${user1Jwt}` },
    });
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.available, false);
    assert.equal(body.username, user2Username.toLowerCase());
  });

  await t.test("A7. Existing username is reported available when checked for owner's current portfolio", async () => {
    // User 1 checking their own portfolio's current handle
    const res = await fetch(
      `${baseUrl}/api/portfolios/check-username/${user1Username}?portfolioId=${portfolio1Id}`,
      { headers: { Authorization: `Bearer ${user1Jwt}` } }
    );
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.available, true);
    assert.equal(body.username, user1Username);
  });

  await t.test("A8. Username belonging to another user is reported unavailable", async () => {
    // User 1 attempts to check User 2's handle for User 1's portfolio
    const res = await fetch(
      `${baseUrl}/api/portfolios/check-username/${user2Username}?portfolioId=${portfolio1Id}`,
      { headers: { Authorization: `Bearer ${user1Jwt}` } }
    );
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.available, false);
  });

  await t.test("A9. Unauthenticated username check returns 401 Unauthorized", async () => {
    const res = await fetch(`${baseUrl}/api/portfolios/check-username/someuser`);
    assert.equal(res.status, 401);
  });

  // ==========================================
  // SECTION B: Portfolio Publishing Tests
  // ==========================================

  await t.test("B1. Owner successfully publishes portfolio (200 OK, published: true, publicUrl generated)", async () => {
    const res = await fetch(`${baseUrl}/api/portfolios/${portfolio1Id}/publish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user1Jwt}` },
    });
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.message, "Portfolio published successfully");
    assert.equal(body.portfolio.id, portfolio1Id);
    assert.equal(body.portfolio.username, user1Username);
    assert.equal(body.portfolio.published, true);
    assert.ok(body.portfolio.publishedAt);
    assert.equal(body.portfolio.publicUrl, `/u/${user1Username}`);

    // Verify DB state
    const dbCheck = await pool.query<{ published: boolean; published_at: Date }>(
      `SELECT published, published_at FROM portfolios WHERE id = $1`,
      [portfolio1Id]
    );
    assert.equal(dbCheck.rows[0].published, true);
    assert.ok(dbCheck.rows[0].published_at);
  });

  await t.test("B2. Unauthenticated user cannot publish portfolio (401 Unauthorized)", async () => {
    const res = await fetch(`${baseUrl}/api/portfolios/${portfolio1Id}/publish`, {
      method: "POST",
    });
    assert.equal(res.status, 401);
  });

  await t.test("B3. User cannot publish another user's portfolio (403 Forbidden)", async () => {
    // User 2 attempts to publish User 1's portfolio
    const res = await fetch(`${baseUrl}/api/portfolios/${portfolio1Id}/publish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user2Jwt}` },
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.match(body.message, /unauthorized/i);
  });

  await t.test("B4. Non-existent portfolio returns 404 Not Found", async () => {
    const fakeUuid = "00000000-0000-0000-0000-000000000000";
    const res = await fetch(`${baseUrl}/api/portfolios/${fakeUuid}/publish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user1Jwt}` },
    });
    assert.equal(res.status, 404);
  });

  await t.test("B5. Publishing rejects portfolios with invalid or reserved username", async () => {
    // Create temporary portfolio with a short username
    const invalidPortRes = await pool.query<{ id: string }>(
      `INSERT INTO portfolios (user_id, name, title, username, template, published)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [user1Id, "Short Handle", "Dev", "ab", "modern", false]
    );
    const invalidPortId = invalidPortRes.rows[0].id;
    createdPortfolioIds.push(invalidPortId);

    const res = await fetch(`${baseUrl}/api/portfolios/${invalidPortId}/publish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user1Jwt}` },
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.message, /at least 3 characters/i);
  });

  await t.test("B6. Publishing rejects unsupported template with 400 Bad Request", async () => {
    const badTplPort = await pool.query<{ id: string }>(
      `INSERT INTO portfolios (user_id, name, title, username, template, published)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [user1Id, "Theme User", "Dev", `tpl_${uniqueSuffix}`, "cyberpunk_neon", false]
    );
    const badPortId = badTplPort.rows[0].id;
    createdPortfolioIds.push(badPortId);

    const res = await fetch(`${baseUrl}/api/portfolios/${badPortId}/publish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user1Jwt}` },
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.message, /unsupported template/i);
  });

  await t.test("B7. Publishing rejects incomplete portfolio missing required name or title", async () => {
    const emptyPort = await pool.query<{ id: string }>(
      `INSERT INTO portfolios (user_id, name, title, username, published)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [user1Id, "", "Engineer", `blank_${uniqueSuffix}`, false]
    );
    const emptyPortId = emptyPort.rows[0].id;
    createdPortfolioIds.push(emptyPortId);

    const res = await fetch(`${baseUrl}/api/portfolios/${emptyPortId}/publish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user1Jwt}` },
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.message, /name is required/i);
  });

  await t.test("B8. Republishing preserves original publication timestamp and does not duplicate", async () => {
    // Fetch initial publication timestamp
    const initialCheck = await pool.query<{ published_at: Date }>(
      `SELECT published_at FROM portfolios WHERE id = $1`,
      [portfolio1Id]
    );
    const initialPublishedAt = new Date(initialCheck.rows[0].published_at).toISOString();

    // Publish again (Republish)
    const res = await fetch(`${baseUrl}/api/portfolios/${portfolio1Id}/publish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user1Jwt}` },
    });
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(new Date(body.portfolio.publishedAt).toISOString(), initialPublishedAt);

    // Verify exactly 1 record exists in DB
    const countCheck = await pool.query(
      `SELECT COUNT(*) FROM portfolios WHERE id = $1`,
      [portfolio1Id]
    );
    assert.equal(Number(countCheck.rows[0].count), 1);
  });

  await t.test("B9. Published portfolio is publicly accessible via GET /api/public/:username", async () => {
    const res = await fetch(`${baseUrl}/api/public/${user1Username}`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.portfolio.username, user1Username);
    assert.equal(body.portfolio.published, true);
    assert.equal(body.portfolio.projects.length, 1);
    assert.equal(body.portfolio.skills.length, 1);
    assert.equal(body.portfolio.experiences.length, 1);
  });

  // ==========================================
  // SECTION C: Portfolio Unpublishing Tests
  // ==========================================

  await t.test("C1. Owner successfully unpublishes portfolio (200 OK, published: false, publicUrl: null)", async () => {
    const res = await fetch(`${baseUrl}/api/portfolios/${portfolio1Id}/unpublish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user1Jwt}` },
    });
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.message, "Portfolio unpublished successfully");
    assert.equal(body.portfolio.id, portfolio1Id);
    assert.equal(body.portfolio.published, false);
    assert.equal(body.portfolio.publicUrl, null);

    // Verify DB state
    const dbCheck = await pool.query<{ published: boolean }>(
      `SELECT published FROM portfolios WHERE id = $1`,
      [portfolio1Id]
    );
    assert.equal(dbCheck.rows[0].published, false);
  });

  await t.test("C2. Unauthenticated user cannot unpublish portfolio (401 Unauthorized)", async () => {
    const res = await fetch(`${baseUrl}/api/portfolios/${portfolio1Id}/unpublish`, {
      method: "POST",
    });
    assert.equal(res.status, 401);
  });

  await t.test("C3. Another user cannot unpublish portfolio (403 Forbidden)", async () => {
    const res = await fetch(`${baseUrl}/api/portfolios/${portfolio1Id}/unpublish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user2Jwt}` },
    });
    assert.equal(res.status, 403);
  });

  await t.test("C4. Non-existent portfolio returns 404 Not Found on unpublish", async () => {
    const fakeUuid = "00000000-0000-0000-0000-000000000000";
    const res = await fetch(`${baseUrl}/api/portfolios/${fakeUuid}/unpublish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user1Jwt}` },
    });
    assert.equal(res.status, 404);
  });

  await t.test("C5. Repeated unpublish is idempotent and safe", async () => {
    // Call unpublish again on already unpublished portfolio
    const res = await fetch(`${baseUrl}/api/portfolios/${portfolio1Id}/unpublish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user1Jwt}` },
    });
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.portfolio.published, false);
  });

  await t.test("C6. Unpublishing preserves all portfolio content, projects, skills, and experience", async () => {
    const [pCheck, projCheck, skillCheck, expCheck] = await Promise.all([
      pool.query(`SELECT username, about, template FROM portfolios WHERE id = $1`, [portfolio1Id]),
      pool.query(`SELECT id FROM projects WHERE portfolio_id = $1`, [portfolio1Id]),
      pool.query(`SELECT id FROM skills WHERE portfolio_id = $1`, [portfolio1Id]),
      pool.query(`SELECT id FROM experience WHERE portfolio_id = $1`, [portfolio1Id]),
    ]);

    assert.equal(pCheck.rows[0].username, user1Username);
    assert.equal(pCheck.rows[0].template, "modern");
    assert.equal(projCheck.rows.length, 1, "Projects must remain intact");
    assert.equal(skillCheck.rows.length, 1, "Skills must remain intact");
    assert.equal(expCheck.rows.length, 1, "Experience must remain intact");
  });

  await t.test("C7. Public API immediately returns 404 after unpublishing", async () => {
    const res = await fetch(`${baseUrl}/api/public/${user1Username}`);
    assert.equal(res.status, 404);

    const body = await res.json();
    assert.equal(body.message, "Portfolio not found");
  });

  await t.test("C8. PUT { published: false } is rejected and leaves state + first-publish published_at intact (PUB-06/PUB-06D regression)", async () => {
    // portfolio1 was published in B1 and unpublished in C1; published_at must still be set
    const before = await pool.query<{ published_at: Date | null }>(
      `SELECT published_at FROM portfolios WHERE id = $1`,
      [portfolio1Id]
    );
    assert.ok(before.rows[0].published_at, "published_at should be retained after /unpublish");
    const originalPublishedAt = new Date(before.rows[0].published_at as Date).toISOString();

    // Republish, then attempt to unpublish through the generic update endpoint
    const pubRes = await fetch(`${baseUrl}/api/portfolios/${portfolio1Id}/publish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${user1Jwt}` },
    });
    assert.equal(pubRes.status, 200);

    const putRes = await fetch(`${baseUrl}/api/portfolios/${portfolio1Id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user1Jwt}`,
      },
      body: JSON.stringify({ published: false }),
    });
    // PUB-06D (D6): only POST /:id/unpublish may change publishing state
    assert.equal(putRes.status, 400);

    const after = await pool.query<{ published: boolean; published_at: Date | null }>(
      `SELECT published, published_at FROM portfolios WHERE id = $1`,
      [portfolio1Id]
    );
    assert.equal(after.rows[0].published, true, "Rejected PUT must not unpublish");
    assert.ok(after.rows[0].published_at, "published_at must remain set");
    assert.equal(
      new Date(after.rows[0].published_at as Date).toISOString(),
      originalPublishedAt,
      "published_at must keep the first-publish timestamp"
    );
  });
});


import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../server";
import { pool } from "../config/database";
import { signToken } from "../utils/auth";
import type { Portfolio } from "../types/portfolio.types";

test("PORTFOLIO-03: Create Portfolio HTTP API Suite (POST /api/portfolios)", async (t) => {
  let server: Server;
  let baseUrl: string;

  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  let testUserId = "";
  let otherUserId = "";
  let validJwt = "";
  const createdPortfolioIds: string[] = [];

  t.before(async () => {
    server = app.listen(0);
    const address = server.address() as AddressInfo;
    baseUrl = `http://localhost:${address.port}`;

    // Create primary test user
    const u1 = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["Portfolio Route Tester", `port_route_${uniqueSuffix}@foliocraft.test`, "hashed_dummy_pw"]
    );
    testUserId = u1.rows[0]!.id;
    validJwt = signToken({ userId: testUserId });

    // Create another user to test unauthorized userId injection
    const u2 = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["Other User", `other_user_${uniqueSuffix}@foliocraft.test`, "hashed_dummy_pw"]
    );
    otherUserId = u2.rows[0]!.id;
  });

  t.after(async () => {
    server.close();
    try {
      for (const pId of createdPortfolioIds) {
        await pool.query("DELETE FROM portfolios WHERE id = $1", [pId]);
      }
      if (testUserId) {
        await pool.query("DELETE FROM users WHERE id = $1", [testUserId]);
      }
      if (otherUserId) {
        await pool.query("DELETE FROM users WHERE id = $1", [otherUserId]);
      }
    } catch (e) {
      console.error("Cleanup error in portfolio.routes.test.ts:", e);
    }
  });

  await t.test("1 & 2 & 3 & 4 & 5. Authenticated user can create a portfolio (201 Created, persisted in DB, owned by user)", async () => {
    const portfolioPayload = {
      name: "Siyumi Gamage",
      title: "Full Stack Developer",
      about: "I build modern web applications with Next.js and Node.",
      email: "siyumi@example.com",
      phone: "+94771234567",
      location: "Colombo, Sri Lanka",
      profileImageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb",
      socialLinks: {
        github: "https://github.com/siyumi",
        linkedin: "https://linkedin.com/in/siyumi",
      },
      username: `siyumi_${uniqueSuffix}`,
      template: "modern",
      published: false,
    };

    const res = await fetch(`${baseUrl}/api/portfolios`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validJwt}`,
      },
      body: JSON.stringify(portfolioPayload),
    });

    assert.equal(res.status, 201, "Expected HTTP 201 Created");
    const body = (await res.json()) as { portfolio: Portfolio };

    assert.ok(body.portfolio, "Response must contain created portfolio object");
    const p = body.portfolio;
    createdPortfolioIds.push(p.id);

    // Verify fields in response
    assert.equal(p.userId, testUserId, "Portfolio must be owned by authenticated user");
    assert.equal(p.name, portfolioPayload.name);
    assert.equal(p.title, portfolioPayload.title);
    assert.equal(p.about, portfolioPayload.about);
    assert.equal(p.email, portfolioPayload.email);
    assert.equal(p.phone, portfolioPayload.phone);
    assert.equal(p.location, portfolioPayload.location);
    assert.equal(p.profileImageUrl, portfolioPayload.profileImageUrl);
    assert.deepEqual(p.socialLinks, portfolioPayload.socialLinks);
    assert.equal(p.username, portfolioPayload.username);
    assert.equal(p.template, portfolioPayload.template);
    assert.equal(p.published, false);

    // Verify persistence directly in PostgreSQL
    const dbCheck = await pool.query(
      "SELECT id, user_id, name, username, title FROM portfolios WHERE id = $1",
      [p.id]
    );
    assert.equal(dbCheck.rows.length, 1, "Portfolio must be persisted in PostgreSQL");
    assert.equal(dbCheck.rows[0].user_id, testUserId);
    assert.equal(dbCheck.rows[0].username, portfolioPayload.username);
  });

  await t.test("6. Unauthenticated request returns 401 Unauthorized", async () => {
    const res = await fetch(`${baseUrl}/api/portfolios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test",
        title: "Dev",
        username: `unauth_${uniqueSuffix}`,
      }),
    });

    assert.equal(res.status, 401);
    const body = (await res.json()) as { message: string };
    assert.match(body.message, /authentication required/i);
  });

  await t.test("7. Missing name returns 400 Bad Request", async () => {
    const res = await fetch(`${baseUrl}/api/portfolios`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validJwt}`,
      },
      body: JSON.stringify({
        title: "Developer",
        username: `noname_${uniqueSuffix}`,
      }),
    });

    assert.equal(res.status, 400);
    const body = (await res.json()) as { message: string };
    assert.match(body.message, /name/i);
  });

  await t.test("8. Missing title returns 400 Bad Request", async () => {
    const res = await fetch(`${baseUrl}/api/portfolios`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validJwt}`,
      },
      body: JSON.stringify({
        name: "Developer Name",
        username: `notitle_${uniqueSuffix}`,
      }),
    });

    assert.equal(res.status, 400);
    const body = (await res.json()) as { message: string };
    assert.match(body.message, /title/i);
  });

  await t.test("9. Missing username returns 400 Bad Request", async () => {
    const res = await fetch(`${baseUrl}/api/portfolios`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validJwt}`,
      },
      body: JSON.stringify({
        name: "Developer Name",
        title: "Lead Architect",
      }),
    });

    assert.equal(res.status, 400);
    const body = (await res.json()) as { message: string };
    assert.match(body.message, /username/i);
  });

  await t.test("10. Invalid request field types are rejected with 400 Bad Request", async () => {
    // socialLinks as string instead of object
    const res1 = await fetch(`${baseUrl}/api/portfolios`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validJwt}`,
      },
      body: JSON.stringify({
        name: "Developer Name",
        title: "Engineer",
        username: `invalid_social_${uniqueSuffix}`,
        socialLinks: "not-an-object",
      }),
    });
    assert.equal(res1.status, 400);

    // Invalid email format
    const res2 = await fetch(`${baseUrl}/api/portfolios`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validJwt}`,
      },
      body: JSON.stringify({
        name: "Developer Name",
        title: "Engineer",
        username: `invalid_email_${uniqueSuffix}`,
        email: "not-a-valid-email",
      }),
    });
    assert.equal(res2.status, 400);
  });

  await t.test("11. Duplicate username returns 409 Conflict", async () => {
    const existingUsername = `siyumi_${uniqueSuffix}`;

    const res = await fetch(`${baseUrl}/api/portfolios`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validJwt}`,
      },
      body: JSON.stringify({
        name: "Another Person",
        title: "Engineer",
        username: existingUsername, // Duplicate
      }),
    });

    assert.equal(res.status, 409, "Expected 409 Conflict on duplicate username");
    const body = (await res.json()) as { message: string };
    assert.equal(body.message, "Username is already taken");
  });

  await t.test("12. Client cannot choose another user by sending userId in the request body", async () => {
    const res = await fetch(`${baseUrl}/api/portfolios`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validJwt}`,
      },
      body: JSON.stringify({
        userId: otherUserId, // Attacker tries to create a portfolio owned by otherUserId
        name: "Injected User Portfolio",
        title: "Security Specialist",
        username: `sec_${uniqueSuffix}`,
      }),
    });

    assert.equal(res.status, 201);
    const body = (await res.json()) as { portfolio: Portfolio };
    createdPortfolioIds.push(body.portfolio.id);

    // Must be owned by the authenticated user, NOT otherUserId
    assert.equal(
      body.portfolio.userId,
      testUserId,
      "Injected userId must be ignored; ownership must belong to authenticated user"
    );
    assert.notEqual(body.portfolio.userId, otherUserId);
  });
});

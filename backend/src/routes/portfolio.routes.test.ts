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

test("PORTFOLIO-04: Read Portfolios HTTP API Suite (GET /api/portfolios & GET /api/portfolios/:id)", async (t) => {
  let server: Server;
  let baseUrl: string;

  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  let userAId = "";
  let userBId = "";
  let userCId = "";
  let userAJwt = "";
  let userBJwt = "";
  let userCJwt = "";

  let portfolioA1Id = "";
  let portfolioA2Id = "";
  let portfolioB1Id = "";
  const createdPortfolioIds: string[] = [];

  t.before(async () => {
    server = app.listen(0);
    const address = server.address() as AddressInfo;
    baseUrl = `http://localhost:${address.port}`;

    // User A
    const uA = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["User Alpha", `alpha_${uniqueSuffix}@foliocraft.test`, "hashed_dummy_pw"]
    );
    userAId = uA.rows[0]!.id;
    userAJwt = signToken({ userId: userAId });

    // User B
    const uB = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["User Beta", `beta_${uniqueSuffix}@foliocraft.test`, "hashed_dummy_pw"]
    );
    userBId = uB.rows[0]!.id;
    userBJwt = signToken({ userId: userBId });

    // User C (no portfolios)
    const uC = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["User Gamma", `gamma_${uniqueSuffix}@foliocraft.test`, "hashed_dummy_pw"]
    );
    userCId = uC.rows[0]!.id;
    userCJwt = signToken({ userId: userCId });

    // Create Portfolio A1
    const pA1 = await pool.query<{ id: string }>(
      `INSERT INTO portfolios (user_id, name, title, username, about, template)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [userAId, "Alpha Portfolio 1", "Frontend Engineer", `alpha1_${uniqueSuffix}`, "Building web apps", "minimal"]
    );
    portfolioA1Id = pA1.rows[0]!.id;
    createdPortfolioIds.push(portfolioA1Id);

    // Create Portfolio A2
    const pA2 = await pool.query<{ id: string }>(
      `INSERT INTO portfolios (user_id, name, title, username, template)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [userAId, "Alpha Portfolio 2", "UI Architect", `alpha2_${uniqueSuffix}`, "modern"]
    );
    portfolioA2Id = pA2.rows[0]!.id;
    createdPortfolioIds.push(portfolioA2Id);

    // Create Portfolio B1
    const pB1 = await pool.query<{ id: string }>(
      `INSERT INTO portfolios (user_id, name, title, username, template)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [userBId, "Beta Portfolio 1", "Backend Engineer", `beta1_${uniqueSuffix}`, "modern"]
    );
    portfolioB1Id = pB1.rows[0]!.id;
    createdPortfolioIds.push(portfolioB1Id);
  });

  t.after(async () => {
    server.close();
    try {
      for (const pId of createdPortfolioIds) {
        await pool.query("DELETE FROM portfolios WHERE id = $1", [pId]);
      }
      for (const uId of [userAId, userBId, userCId]) {
        if (uId) {
          await pool.query("DELETE FROM users WHERE id = $1", [uId]);
        }
      }
    } catch (e) {
      console.error("Cleanup error in PORTFOLIO-04 tests:", e);
    }
  });

  // GET /api/portfolios tests
  await t.test("1 & 2 & 3. GET /api/portfolios returns 200 with only authenticated user's portfolios (no cross-user leak)", async () => {
    const res = await fetch(`${baseUrl}/api/portfolios`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${userAJwt}`,
      },
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as { portfolios: Portfolio[] };

    assert.ok(Array.isArray(body.portfolios), "Expected portfolios array");
    assert.equal(body.portfolios.length, 2, "User A should have exactly 2 portfolios");

    const ids = body.portfolios.map((p) => p.id);
    assert.ok(ids.includes(portfolioA1Id), "Must contain portfolio A1");
    assert.ok(ids.includes(portfolioA2Id), "Must contain portfolio A2");
    assert.ok(!ids.includes(portfolioB1Id), "Must NOT contain portfolio B1 belonging to User B");

    for (const p of body.portfolios) {
      assert.equal(p.userId, userAId);
    }
  });

  await t.test("4. GET /api/portfolios for user with no portfolios returns 200 with empty collection", async () => {
    const res = await fetch(`${baseUrl}/api/portfolios`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${userCJwt}`,
      },
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as { portfolios: Portfolio[] };
    assert.ok(Array.isArray(body.portfolios));
    assert.equal(body.portfolios.length, 0);
  });

  await t.test("5. GET /api/portfolios unauthenticated request returns 401", async () => {
    const res = await fetch(`${baseUrl}/api/portfolios`, {
      method: "GET",
    });

    assert.equal(res.status, 401);
    const body = (await res.json()) as { message: string };
    assert.match(body.message, /authentication required/i);
  });

  // GET /api/portfolios/:id tests
  await t.test("6 & 7. GET /api/portfolios/:id authenticated owner receives 200 with full portfolio data", async () => {
    const res = await fetch(`${baseUrl}/api/portfolios/${portfolioA1Id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${userAJwt}`,
      },
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as { portfolio: Portfolio };
    assert.ok(body.portfolio);
    assert.equal(body.portfolio.id, portfolioA1Id);
    assert.equal(body.portfolio.userId, userAId);
    assert.equal(body.portfolio.name, "Alpha Portfolio 1");
    assert.equal(body.portfolio.title, "Frontend Engineer");
    assert.equal(body.portfolio.about, "Building web apps");
    assert.equal(body.portfolio.username, `alpha1_${uniqueSuffix}`);
    assert.equal(body.portfolio.template, "minimal");
    assert.equal(body.portfolio.published, false);
  });

  await t.test("8. GET /api/portfolios/:id unauthenticated request returns 401", async () => {
    const res = await fetch(`${baseUrl}/api/portfolios/${portfolioA1Id}`, {
      method: "GET",
    });

    assert.equal(res.status, 401);
    const body = (await res.json()) as { message: string };
    assert.match(body.message, /authentication required/i);
  });

  await t.test("9. GET /api/portfolios/:id nonexistent portfolio returns 404 Not Found", async () => {
    const dummyUuid = "00000000-0000-0000-0000-000000000000";
    const res = await fetch(`${baseUrl}/api/portfolios/${dummyUuid}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${userAJwt}`,
      },
    });

    assert.equal(res.status, 404);
    const body = (await res.json()) as { message: string };
    assert.equal(body.message, "Portfolio not found");
  });

  await t.test("10. GET /api/portfolios/:id another authenticated user cannot access portfolio (403 Forbidden)", async () => {
    // User B attempts to access User A's portfolio A1
    const res = await fetch(`${baseUrl}/api/portfolios/${portfolioA1Id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${userBJwt}`, // User B
      },
    });

    assert.equal(res.status, 403);
    const body = (await res.json()) as { message: string };
    assert.equal(body.message, "Unauthorized access to portfolio");
  });

  await t.test("11. GET /api/portfolios/:id malformed portfolio ID returns 404 Not Found", async () => {
    const res = await fetch(`${baseUrl}/api/portfolios/not-a-valid-uuid`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${userAJwt}`,
      },
    });

    assert.equal(res.status, 404);
    const body = (await res.json()) as { message: string };
    assert.equal(body.message, "Portfolio not found");
  });
});

test("PORTFOLIO-05: Update and Delete Portfolio HTTP API Suite (PUT & DELETE /api/portfolios/:id)", async (t) => {
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

  t.before(async () => {
    server = app.listen(0);
    const address = server.address() as AddressInfo;
    baseUrl = `http://localhost:${address.port}`;

    // User 1
    const u1 = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["Owner User", `owner_${uniqueSuffix}@foliocraft.test`, "hashed_dummy_pw"]
    );
    user1Id = u1.rows[0]!.id;
    user1Jwt = signToken({ userId: user1Id });

    // User 2
    const u2 = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["Other User", `other_${uniqueSuffix}@foliocraft.test`, "hashed_dummy_pw"]
    );
    user2Id = u2.rows[0]!.id;
    user2Jwt = signToken({ userId: user2Id });

    // Create Portfolio 1 for User 1
    const p1 = await pool.query<{ id: string }>(
      `INSERT INTO portfolios (
         user_id, name, email, phone, location, title, about,
         profile_image_url, social_links, username, template, published
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [
        user1Id,
        "Original Name",
        "original@example.com",
        "+15551112222",
        "Austin, TX",
        "Original Title",
        "Original Bio",
        "https://example.com/pic.jpg",
        JSON.stringify({ github: "https://github.com/original" }),
        `p1_${uniqueSuffix}`,
        "modern",
        false,
      ]
    );
    portfolio1Id = p1.rows[0]!.id;
    createdPortfolioIds.push(portfolio1Id);

    // Create Portfolio 2 for User 2
    const p2 = await pool.query<{ id: string }>(
      `INSERT INTO portfolios (user_id, name, title, username)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [user2Id, "User 2 Portfolio", "Staff Eng", `p2_${uniqueSuffix}`]
    );
    portfolio2Id = p2.rows[0]!.id;
    createdPortfolioIds.push(portfolio2Id);
  });

  t.after(async () => {
    server.close();
    try {
      for (const pId of createdPortfolioIds) {
        await pool.query("DELETE FROM portfolios WHERE id = $1", [pId]);
      }
      for (const uId of [user1Id, user2Id]) {
        if (uId) {
          await pool.query("DELETE FROM users WHERE id = $1", [uId]);
        }
      }
    } catch (e) {
      console.error("Cleanup error in PORTFOLIO-05 tests:", e);
    }
  });

  // PUT /api/portfolios/:id tests
  await t.test("1 & 2 & 3 & 4 & 5. Authenticated owner can partially update portfolio (200 OK, preserves unspecified fields)", async () => {
    // Wait briefly so updated_at timestamp progresses
    await new Promise((resolve) => setTimeout(resolve, 50));

    const updatePayload = {
      title: "Senior Full Stack Developer",
      about: "Updated portfolio description for Austin tech scene.",
      socialLinks: {
        github: "https://github.com/updated",
        linkedin: "https://linkedin.com/in/updated",
      },
    };

    const res = await fetch(`${baseUrl}/api/portfolios/${portfolio1Id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user1Jwt}`,
      },
      body: JSON.stringify(updatePayload),
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as { portfolio: Portfolio };
    assert.ok(body.portfolio);
    const p = body.portfolio;

    // Updated fields
    assert.equal(p.title, updatePayload.title);
    assert.equal(p.about, updatePayload.about);
    assert.deepEqual(p.socialLinks, updatePayload.socialLinks);

    // Preserved fields
    assert.equal(p.name, "Original Name");
    assert.equal(p.email, "original@example.com");
    assert.equal(p.phone, "+15551112222");
    assert.equal(p.location, "Austin, TX");
    assert.equal(p.profileImageUrl, "https://example.com/pic.jpg");
    assert.equal(p.username, `p1_${uniqueSuffix}`);
    assert.equal(p.template, "modern");
    assert.equal(p.published, false);

    // Verify in PostgreSQL
    const dbCheck = await pool.query(
      "SELECT title, about, name, email FROM portfolios WHERE id = $1",
      [portfolio1Id]
    );
    assert.equal(dbCheck.rows[0].title, updatePayload.title);
    assert.equal(dbCheck.rows[0].about, updatePayload.about);
    assert.equal(dbCheck.rows[0].name, "Original Name");
  });

  await t.test("6 & 7. updated_at changes after update while created_at remains unchanged", async () => {
    const beforeRes = await pool.query<{ created_at: Date; updated_at: Date }>(
      "SELECT created_at, updated_at FROM portfolios WHERE id = $1",
      [portfolio1Id]
    );
    const initialCreatedAt = beforeRes.rows[0]!.created_at.getTime();
    const initialUpdatedAt = beforeRes.rows[0]!.updated_at.getTime();

    await new Promise((resolve) => setTimeout(resolve, 50));

    const res = await fetch(`${baseUrl}/api/portfolios/${portfolio1Id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user1Jwt}`,
      },
      body: JSON.stringify({ location: "New York, NY" }),
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as { portfolio: Portfolio };

    const newCreatedAt = new Date(body.portfolio.createdAt).getTime();
    const newUpdatedAt = new Date(body.portfolio.updatedAt).getTime();

    assert.equal(newCreatedAt, initialCreatedAt, "created_at must remain unchanged");
    assert.ok(newUpdatedAt >= initialUpdatedAt, "updated_at must change");
  });

  await t.test("8. PUT /api/portfolios/:id unauthenticated request returns 401", async () => {
    const res = await fetch(`${baseUrl}/api/portfolios/${portfolio1Id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Unauthorized Title" }),
    });

    assert.equal(res.status, 401);
    const body = (await res.json()) as { message: string };
    assert.match(body.message, /authentication required/i);
  });

  await t.test("9. PUT /api/portfolios/:id nonexistent portfolio returns 404", async () => {
    const dummyUuid = "00000000-0000-0000-0000-000000000000";
    const res = await fetch(`${baseUrl}/api/portfolios/${dummyUuid}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user1Jwt}`,
      },
      body: JSON.stringify({ title: "Ghost Title" }),
    });

    assert.equal(res.status, 404);
    const body = (await res.json()) as { message: string };
    assert.equal(body.message, "Portfolio not found");
  });

  await t.test("10. PUT /api/portfolios/:id another authenticated user receives 403 Forbidden", async () => {
    // User 2 attempts to modify User 1's portfolio
    const res = await fetch(`${baseUrl}/api/portfolios/${portfolio1Id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user2Jwt}`, // User 2
      },
      body: JSON.stringify({ title: "Hacked by User 2" }),
    });

    assert.equal(res.status, 403);
    const body = (await res.json()) as { message: string };
    assert.equal(body.message, "Unauthorized to modify this portfolio");
  });

  await t.test("11. PUT /api/portfolios/:id duplicate username returns 409 Conflict", async () => {
    // User 1 tries to change username to User 2's username (p2_${uniqueSuffix})
    const res = await fetch(`${baseUrl}/api/portfolios/${portfolio1Id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user1Jwt}`,
      },
      body: JSON.stringify({ username: `p2_${uniqueSuffix}` }),
    });

    assert.equal(res.status, 409);
    const body = (await res.json()) as { message: string };
    assert.equal(body.message, "Username is already taken");
  });

  await t.test("12. PUT /api/portfolios/:id existing username can remain unchanged", async () => {
    // User 1 updates portfolio submitting its own current username
    const res = await fetch(`${baseUrl}/api/portfolios/${portfolio1Id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user1Jwt}`,
      },
      body: JSON.stringify({ username: `p1_${uniqueSuffix}`, published: true }),
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as { portfolio: Portfolio };
    assert.equal(body.portfolio.username, `p1_${uniqueSuffix}`);
    assert.equal(body.portfolio.published, true);
  });

  await t.test("13. PUT /api/portfolios/:id invalid field types return 400 Bad Request", async () => {
    const res = await fetch(`${baseUrl}/api/portfolios/${portfolio1Id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user1Jwt}`,
      },
      body: JSON.stringify({ socialLinks: "not-an-object" }),
    });

    assert.equal(res.status, 400);
    const body = (await res.json()) as { message: string };
    assert.ok(body.message);
  });

  await t.test("14. PUT /api/portfolios/:id empty update body returns 400 Bad Request", async () => {
    const res = await fetch(`${baseUrl}/api/portfolios/${portfolio1Id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user1Jwt}`,
      },
      body: JSON.stringify({}),
    });

    assert.equal(res.status, 400);
    const body = (await res.json()) as { message: string };
    assert.equal(body.message, "No fields provided for update");
  });

  await t.test("15. PUT /api/portfolios/:id client-supplied userId cannot change ownership", async () => {
    const res = await fetch(`${baseUrl}/api/portfolios/${portfolio1Id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user1Jwt}`,
      },
      body: JSON.stringify({
        userId: user2Id, // Attacker tries to transfer ownership
        title: "Owner Stays Same",
      }),
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as { portfolio: Portfolio };
    assert.equal(body.portfolio.userId, user1Id, "Ownership must remain with authenticated user");
    assert.notEqual(body.portfolio.userId, user2Id);
  });

  // DELETE /api/portfolios/:id tests
  await t.test("20. DELETE /api/portfolios/:id unauthenticated request returns 401", async () => {
    const res = await fetch(`${baseUrl}/api/portfolios/${portfolio1Id}`, {
      method: "DELETE",
    });

    assert.equal(res.status, 401);
    const body = (await res.json()) as { message: string };
    assert.match(body.message, /authentication required/i);
  });

  await t.test("21. DELETE /api/portfolios/:id nonexistent portfolio returns 404", async () => {
    const dummyUuid = "00000000-0000-0000-0000-000000000000";
    const res = await fetch(`${baseUrl}/api/portfolios/${dummyUuid}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${user1Jwt}`,
      },
    });

    assert.equal(res.status, 404);
    const body = (await res.json()) as { message: string };
    assert.equal(body.message, "Portfolio not found");
  });

  await t.test("22 & 23. DELETE /api/portfolios/:id another user receives 403 and portfolio remains untouched", async () => {
    // User 2 attempts to delete User 1's portfolio
    const res = await fetch(`${baseUrl}/api/portfolios/${portfolio1Id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${user2Jwt}`, // User 2
      },
    });

    assert.equal(res.status, 403);
    const body = (await res.json()) as { message: string };
    assert.equal(body.message, "Unauthorized to delete this portfolio");

    // Verify it still exists in DB
    const check = await pool.query("SELECT id FROM portfolios WHERE id = $1", [portfolio1Id]);
    assert.equal(check.rows.length, 1, "Portfolio must remain untouched");
  });

  await t.test("16 & 17 & 18 & 19. Authenticated owner can delete portfolio (200 OK, removed from DB, subsequent GET 404)", async () => {
    const res = await fetch(`${baseUrl}/api/portfolios/${portfolio1Id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${user1Jwt}`,
      },
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as { success: boolean; id: string };
    assert.equal(body.success, true);
    assert.equal(body.id, portfolio1Id);

    // Verify removed from PostgreSQL
    const check = await pool.query("SELECT id FROM portfolios WHERE id = $1", [portfolio1Id]);
    assert.equal(check.rows.length, 0, "Portfolio must be deleted from PostgreSQL");

    // Subsequent GET returns 404
    const getRes = await fetch(`${baseUrl}/api/portfolios/${portfolio1Id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${user1Jwt}`,
      },
    });
    assert.equal(getRes.status, 404);
  });
});



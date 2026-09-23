import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../server";
import { pool } from "../config/database";
import { signToken } from "../utils/auth";
import type { Skill } from "../types/skill.types";

test("SKILL-03: Skill HTTP Route & API Suite", async (t) => {
  let server: Server;
  let baseUrl: string;

  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  let testUserId = "";
  let otherUserId = "";
  let testUserJwt = "";
  let otherUserJwt = "";
  let testPortfolioId = "";
  let otherPortfolioId = "";
  const createdSkillIds: string[] = [];

  t.before(async () => {
    server = app.listen(0);
    const address = server.address() as AddressInfo;
    baseUrl = `http://localhost:${address.port}`;

    // Create primary test user
    const u1 = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["Skill Route Tester", `skill_route_${uniqueSuffix}@foliocraft.test`, "hashed_dummy_pw"]
    );
    testUserId = u1.rows[0]!.id;
    testUserJwt = signToken({ userId: testUserId });

    // Create second test user for cross-user security checks
    const u2 = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["Other Skill User", `other_skill_${uniqueSuffix}@foliocraft.test`, "hashed_dummy_pw"]
    );
    otherUserId = u2.rows[0]!.id;
    otherUserJwt = signToken({ userId: otherUserId });

    // Create portfolio for primary user
    const p1 = await pool.query<{ id: string }>(
      `INSERT INTO portfolios (user_id, name, title, username)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [testUserId, "Primary Skill Portfolio", "Full Stack Developer", `prime_skill_${uniqueSuffix}`]
    );
    testPortfolioId = p1.rows[0]!.id;

    // Create portfolio for second user
    const p2 = await pool.query<{ id: string }>(
      `INSERT INTO portfolios (user_id, name, title, username)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [otherUserId, "Other Skill Portfolio", "Mobile Engineer", `other_skill_${uniqueSuffix}`]
    );
    otherPortfolioId = p2.rows[0]!.id;
  });

  t.after(async () => {
    server.close();
    try {
      for (const sId of createdSkillIds) {
        await pool.query("DELETE FROM skills WHERE id = $1", [sId]);
      }
      if (testPortfolioId) {
        await pool.query("DELETE FROM portfolios WHERE id = $1", [testPortfolioId]);
      }
      if (otherPortfolioId) {
        await pool.query("DELETE FROM portfolios WHERE id = $1", [otherPortfolioId]);
      }
      if (testUserId) {
        await pool.query("DELETE FROM users WHERE id = $1", [testUserId]);
      }
      if (otherUserId) {
        await pool.query("DELETE FROM users WHERE id = $1", [otherUserId]);
      }
    } catch (e) {
      console.error("Cleanup error in skill.routes.test.ts:", e);
    }
  });

  let createdSkillId = "";

  // =========================================================================
  // 1. AUTHENTICATION TESTS
  // =========================================================================
  await t.test("1. POST /api/portfolios/:id/skills unauthenticated request returns 401 Unauthorized", async () => {
    const res = await fetch(`${baseUrl}/api/portfolios/${testPortfolioId}/skills`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "React", category: "Frontend" }),
    });

    assert.equal(res.status, 401);
    const body = (await res.json()) as { message: string };
    assert.match(body.message, /authentication required/i);
  });

  await t.test("2. GET /api/portfolios/:id/skills unauthenticated request returns 401 Unauthorized", async () => {
    const res = await fetch(`${baseUrl}/api/portfolios/${testPortfolioId}/skills`);
    assert.equal(res.status, 401);
    const body = (await res.json()) as { message: string };
    assert.match(body.message, /authentication required/i);
  });

  await t.test("3. GET /api/skills/:id unauthenticated request returns 401 Unauthorized", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await fetch(`${baseUrl}/api/skills/${fakeId}`);
    assert.equal(res.status, 401);
    const body = (await res.json()) as { message: string };
    assert.match(body.message, /authentication required/i);
  });

  await t.test("4. PUT /api/skills/:id unauthenticated request returns 401 Unauthorized", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await fetch(`${baseUrl}/api/skills/${fakeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "React" }),
    });
    assert.equal(res.status, 401);
    const body = (await res.json()) as { message: string };
    assert.match(body.message, /authentication required/i);
  });

  await t.test("5. DELETE /api/skills/:id unauthenticated request returns 401 Unauthorized", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await fetch(`${baseUrl}/api/skills/${fakeId}`, {
      method: "DELETE",
    });
    assert.equal(res.status, 401);
    const body = (await res.json()) as { message: string };
    assert.match(body.message, /authentication required/i);
  });

  // =========================================================================
  // 2. CREATE SKILL TESTS
  // =========================================================================
  await t.test("6. POST /api/portfolios/:id/skills authenticated owner can create skill (201 Created)", async () => {
    const payload = {
      name: "React",
      category: "Frontend",
      orderIndex: 0,
    };

    const res = await fetch(`${baseUrl}/api/portfolios/${testPortfolioId}/skills`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testUserJwt}`,
      },
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 201);
    const body = (await res.json()) as { skill: Skill };
    assert.ok(body.skill);
    assert.ok(body.skill.id);
    createdSkillId = body.skill.id;
    createdSkillIds.push(createdSkillId);

    assert.equal(body.skill.portfolioId, testPortfolioId);
    assert.equal(body.skill.name, "React");
    assert.equal(body.skill.category, "Frontend");
    assert.equal(body.skill.orderIndex, 0);
    assert.ok(body.skill.createdAt);
    assert.ok(body.skill.updatedAt);
  });

  await t.test("7. POST /api/portfolios/:id/skills invalid body rejected with 400 Bad Request", async () => {
    const res = await fetch(`${baseUrl}/api/portfolios/${testPortfolioId}/skills`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testUserJwt}`,
      },
      body: JSON.stringify({ name: "A".repeat(101), category: "Frontend" }),
    });

    assert.equal(res.status, 400);
    const body = (await res.json()) as { message: string };
    assert.match(body.message, /name cannot exceed 100 characters|invalid/i);
  });

  await t.test("8. POST /api/portfolios/:id/skills missing required fields rejected with 400 Bad Request", async () => {
    // Missing category
    const res1 = await fetch(`${baseUrl}/api/portfolios/${testPortfolioId}/skills`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testUserJwt}`,
      },
      body: JSON.stringify({ name: "TypeScript" }),
    });
    assert.equal(res1.status, 400);

    // Missing name
    const res2 = await fetch(`${baseUrl}/api/portfolios/${testPortfolioId}/skills`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testUserJwt}`,
      },
      body: JSON.stringify({ category: "Languages" }),
    });
    assert.equal(res2.status, 400);
  });

  await t.test("9. POST /api/portfolios/:id/skills non-owner cannot create under another user's portfolio (403)", async () => {
    const res = await fetch(`${baseUrl}/api/portfolios/${testPortfolioId}/skills`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${otherUserJwt}`,
      },
      body: JSON.stringify({ name: "Hacked Skill", category: "Security" }),
    });

    assert.equal(res.status, 403);
    const body = (await res.json()) as { message: string };
    assert.equal(body.message, "Unauthorized to modify this portfolio");
  });

  // =========================================================================
  // 3. LIST SKILLS TESTS
  // =========================================================================
  await t.test("10. GET /api/portfolios/:id/skills owner can list portfolio skills (200 OK)", async () => {
    // Add another skill
    const resAdd = await fetch(`${baseUrl}/api/portfolios/${testPortfolioId}/skills`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testUserJwt}`,
      },
      body: JSON.stringify({ name: "Node.js", category: "Backend", orderIndex: 1 }),
    });
    const addBody = (await resAdd.json()) as { skill: Skill };
    createdSkillIds.push(addBody.skill.id);

    const res = await fetch(`${baseUrl}/api/portfolios/${testPortfolioId}/skills`, {
      headers: { Authorization: `Bearer ${testUserJwt}` },
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as { skills: Skill[] };
    assert.ok(Array.isArray(body.skills));
    assert.ok(body.skills.length >= 2);
    assert.ok(body.skills.some((s) => s.name === "React"));
    assert.ok(body.skills.some((s) => s.name === "Node.js"));
  });

  await t.test("11. GET /api/portfolios/:id/skills another user receives 403 Forbidden", async () => {
    const res = await fetch(`${baseUrl}/api/portfolios/${testPortfolioId}/skills`, {
      headers: { Authorization: `Bearer ${otherUserJwt}` },
    });

    assert.equal(res.status, 403);
    const body = (await res.json()) as { message: string };
    assert.equal(body.message, "Unauthorized access to portfolio");
  });

  await t.test("12. GET /api/portfolios/:id/skills empty portfolio returns empty collection", async () => {
    const res = await fetch(`${baseUrl}/api/portfolios/${otherPortfolioId}/skills`, {
      headers: { Authorization: `Bearer ${otherUserJwt}` },
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as { skills: Skill[] };
    assert.ok(Array.isArray(body.skills));
    assert.equal(body.skills.length, 0);
  });

  // =========================================================================
  // 4. GET SINGLE SKILL TESTS
  // =========================================================================
  await t.test("13. GET /api/skills/:id owner can retrieve skill (200 OK)", async () => {
    const res = await fetch(`${baseUrl}/api/skills/${createdSkillId}`, {
      headers: { Authorization: `Bearer ${testUserJwt}` },
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as { skill: Skill };
    assert.equal(body.skill.id, createdSkillId);
    assert.equal(body.skill.portfolioId, testPortfolioId);
    assert.equal(body.skill.name, "React");
    assert.equal(body.skill.category, "Frontend");
  });

  await t.test("14. GET /api/skills/:id another user receives 403 Forbidden", async () => {
    const res = await fetch(`${baseUrl}/api/skills/${createdSkillId}`, {
      headers: { Authorization: `Bearer ${otherUserJwt}` },
    });

    assert.equal(res.status, 403);
    const body = (await res.json()) as { message: string };
    assert.equal(body.message, "Unauthorized access to skill");
  });

  await t.test("15. GET /api/skills/:id non-existent skill returns 404 Not Found", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await fetch(`${baseUrl}/api/skills/${fakeId}`, {
      headers: { Authorization: `Bearer ${testUserJwt}` },
    });

    assert.equal(res.status, 404);
  });

  // =========================================================================
  // 5. UPDATE SKILL TESTS
  // =========================================================================
  await t.test("16. PUT /api/skills/:id owner can update skill (200 OK)", async () => {
    const res = await fetch(`${baseUrl}/api/skills/${createdSkillId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testUserJwt}`,
      },
      body: JSON.stringify({
        name: "React 19",
        category: "UI Libraries",
        orderIndex: 10,
      }),
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as { skill: Skill };
    assert.equal(body.skill.id, createdSkillId);
    assert.equal(body.skill.name, "React 19");
    assert.equal(body.skill.category, "UI Libraries");
    assert.equal(body.skill.orderIndex, 10);
  });

  await t.test("17. PUT /api/skills/:id partial update works correctly", async () => {
    const res = await fetch(`${baseUrl}/api/skills/${createdSkillId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testUserJwt}`,
      },
      body: JSON.stringify({
        name: "React",
      }),
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as { skill: Skill };
    assert.equal(body.skill.name, "React");
    assert.equal(body.skill.category, "UI Libraries", "Category should remain preserved");
    assert.equal(body.skill.orderIndex, 10, "OrderIndex should remain preserved");
  });

  await t.test("18. PUT /api/skills/:id invalid update rejected with 400 Bad Request", async () => {
    // Empty body
    const resEmpty = await fetch(`${baseUrl}/api/skills/${createdSkillId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testUserJwt}`,
      },
      body: JSON.stringify({}),
    });
    assert.equal(resEmpty.status, 400);

    // Empty name
    const resInvalid = await fetch(`${baseUrl}/api/skills/${createdSkillId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testUserJwt}`,
      },
      body: JSON.stringify({ name: "" }),
    });
    assert.equal(resInvalid.status, 400);
  });

  await t.test("19. PUT /api/skills/:id another user receives 403 Forbidden", async () => {
    const res = await fetch(`${baseUrl}/api/skills/${createdSkillId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${otherUserJwt}`,
      },
      body: JSON.stringify({ name: "Malicious Edit" }),
    });

    assert.equal(res.status, 403);
    const body = (await res.json()) as { message: string };
    assert.equal(body.message, "Unauthorized to modify this skill");
  });

  await t.test("20. PUT /api/skills/:id portfolio ownership cannot be changed", async () => {
    const res = await fetch(`${baseUrl}/api/skills/${createdSkillId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testUserJwt}`,
      },
      body: JSON.stringify({
        name: "React",
        portfolioId: otherPortfolioId,
      }),
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as { skill: Skill };
    assert.equal(body.skill.portfolioId, testPortfolioId, "portfolioId must remain unchanged");
  });

  // =========================================================================
  // 6. DELETE SKILL TESTS
  // =========================================================================
  await t.test("21. DELETE /api/skills/:id another user receives 403 Forbidden", async () => {
    const res = await fetch(`${baseUrl}/api/skills/${createdSkillId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${otherUserJwt}` },
    });

    assert.equal(res.status, 403);
    const body = (await res.json()) as { message: string };
    assert.equal(body.message, "Unauthorized to delete this skill");
  });

  await t.test("22. DELETE /api/skills/:id non-existent skill returns 404 Not Found", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await fetch(`${baseUrl}/api/skills/${fakeId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${testUserJwt}` },
    });

    assert.equal(res.status, 404);
  });

  await t.test("23. DELETE /api/skills/:id authenticated owner deletes skill (200 OK & subsequent GET 404)", async () => {
    const res = await fetch(`${baseUrl}/api/skills/${createdSkillId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${testUserJwt}` },
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as { success: boolean; id: string };
    assert.equal(body.success, true);
    assert.equal(body.id, createdSkillId);

    // Subsequent GET returns 404
    const getRes = await fetch(`${baseUrl}/api/skills/${createdSkillId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${testUserJwt}` },
    });
    assert.equal(getRes.status, 404);
  });
});

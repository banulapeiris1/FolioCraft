import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../server";
import { pool } from "../config/database";
import { signToken } from "../utils/auth";
import {
  createSkill,
  getSkills,
  getSkill,
  updateSkill,
  deleteSkill,
  ApiError,
} from "../../../frontend/src/lib/api";

test("SKILL-04: Frontend Skill API Client Integration Suite", async (t) => {
  let server: Server;
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
    process.env.NEXT_PUBLIC_API_URL = `http://localhost:${address.port}`;

    // Create user 1
    const u1 = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["Skill Client Tester One", `skill_client1_${uniqueSuffix}@foliocraft.test`, "hashed_dummy_pw"]
    );
    testUserId = u1.rows[0]!.id;
    testUserJwt = signToken({ userId: testUserId });

    // Create user 2
    const u2 = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["Skill Client Tester Two", `skill_client2_${uniqueSuffix}@foliocraft.test`, "hashed_dummy_pw"]
    );
    otherUserId = u2.rows[0]!.id;
    otherUserJwt = signToken({ userId: otherUserId });

    // Create portfolio for user 1
    const p1 = await pool.query<{ id: string }>(
      `INSERT INTO portfolios (user_id, name, title, username)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [testUserId, "Skill Client Portfolio", "Frontend Architect", `skill_client_port_${uniqueSuffix}`]
    );
    testPortfolioId = p1.rows[0]!.id;

    // Create portfolio for user 2
    const p2 = await pool.query<{ id: string }>(
      `INSERT INTO portfolios (user_id, name, title, username)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [otherUserId, "Other Skill Client Portfolio", "DevOps Lead", `other_skill_client_${uniqueSuffix}`]
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
      console.error("Cleanup error in skill.api-client.test.ts:", e);
    }
  });

  let createdSkillId = "";

  await t.test("1. createSkill client function creates skill via API", async () => {
    const payload = {
      name: "React",
      category: "Frontend",
      orderIndex: 0,
    };

    const res = await createSkill(testPortfolioId, payload, testUserJwt);

    assert.ok(res.skill);
    assert.ok(res.skill.id);
    createdSkillId = res.skill.id;
    createdSkillIds.push(createdSkillId);

    assert.equal(res.skill.name, "React");
    assert.equal(res.skill.category, "Frontend");
    assert.equal(res.skill.orderIndex, 0);
    assert.equal(res.skill.portfolioId, testPortfolioId);
  });

  await t.test("2. getSkills client function retrieves all skills for portfolio", async () => {
    // Add second skill
    const res2 = await createSkill(
      testPortfolioId,
      { name: "TypeScript", category: "Languages", orderIndex: 1 },
      testUserJwt
    );
    createdSkillIds.push(res2.skill.id);

    const res = await getSkills(testPortfolioId, testUserJwt);

    assert.ok(Array.isArray(res.skills));
    assert.ok(res.skills.length >= 2);
    assert.ok(res.skills.some((s) => s.id === createdSkillId));
    assert.ok(res.skills.some((s) => s.id === res2.skill.id));
  });

  await t.test("3. getSkill client function retrieves single skill by ID", async () => {
    const res = await getSkill(createdSkillId, testUserJwt);

    assert.ok(res.skill);
    assert.equal(res.skill.id, createdSkillId);
    assert.equal(res.skill.name, "React");
    assert.equal(res.skill.category, "Frontend");
    assert.equal(res.skill.portfolioId, testPortfolioId);
  });

  await t.test("4. updateSkill client function partially updates skill", async () => {
    const res = await updateSkill(
      createdSkillId,
      { name: "React 19", orderIndex: 5 },
      testUserJwt
    );

    assert.ok(res.skill);
    assert.equal(res.skill.id, createdSkillId);
    assert.equal(res.skill.name, "React 19");
    assert.equal(res.skill.category, "Frontend", "Category must remain preserved");
    assert.equal(res.skill.orderIndex, 5);
  });

  await t.test("5. createSkill client function throws ApiError 401 on invalid/missing auth", async () => {
    await assert.rejects(
      async () => {
        await createSkill(
          testPortfolioId,
          { name: "Unauthorized Skill", category: "Frontend" },
          "invalid.jwt.token"
        );
      },
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 401);
        return true;
      }
    );
  });

  await t.test("6. createSkill client function throws ApiError 403 when modifying another user's portfolio", async () => {
    await assert.rejects(
      async () => {
        await createSkill(
          otherPortfolioId,
          { name: "Intruder Skill", category: "Security" },
          testUserJwt
        );
      },
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 403);
        return true;
      }
    );
  });

  await t.test("7. getSkills client function throws ApiError 403 on another user's portfolio", async () => {
    await assert.rejects(
      async () => {
        await getSkills(otherPortfolioId, testUserJwt);
      },
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 403);
        return true;
      }
    );
  });

  await t.test("8. getSkill client function throws ApiError 403 on another user's skill", async () => {
    await assert.rejects(
      async () => {
        await getSkill(createdSkillId, otherUserJwt);
      },
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 403);
        return true;
      }
    );
  });

  await t.test("9. getSkill client function throws ApiError 404 on non-existent skill", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    await assert.rejects(
      async () => {
        await getSkill(fakeId, testUserJwt);
      },
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 404);
        return true;
      }
    );
  });

  await t.test("10. deleteSkill client function removes skill and subsequent getSkill throws 404", async () => {
    const res = await deleteSkill(createdSkillId, testUserJwt);
    assert.equal(res.success, true);
    assert.equal(res.id, createdSkillId);

    await assert.rejects(
      async () => {
        await getSkill(createdSkillId, testUserJwt);
      },
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 404);
        return true;
      }
    );
  });
});

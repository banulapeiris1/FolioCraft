import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../server";
import { pool } from "../config/database";
import { signToken } from "../utils/auth";
import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  ApiError,
} from "../../../frontend/src/lib/api";


test("PROJECT-04: Frontend Project API Client Integration Suite", async (t) => {
  let server: Server;
  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  let testUserId = "";
  let otherUserId = "";
  let testUserJwt = "";
  let otherUserJwt = "";
  let testPortfolioId = "";
  let otherPortfolioId = "";
  const createdProjectIds: string[] = [];

  t.before(async () => {
    server = app.listen(0);
    const address = server.address() as AddressInfo;
    process.env.NEXT_PUBLIC_API_URL = `http://localhost:${address.port}`;

    // Create user 1
    const u1 = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["Client Tester One", `client_test1_${uniqueSuffix}@foliocraft.test`, "hashed_dummy_pw"]
    );
    testUserId = u1.rows[0]!.id;
    testUserJwt = signToken({ userId: testUserId });

    // Create user 2
    const u2 = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["Client Tester Two", `client_test2_${uniqueSuffix}@foliocraft.test`, "hashed_dummy_pw"]
    );
    otherUserId = u2.rows[0]!.id;
    otherUserJwt = signToken({ userId: otherUserId });

    // Create portfolio for user 1
    const p1 = await pool.query<{ id: string }>(
      `INSERT INTO portfolios (user_id, name, title, username)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [testUserId, "Client Portfolio", "Full Stack Lead", `client_port_${uniqueSuffix}`]
    );
    testPortfolioId = p1.rows[0]!.id;

    // Create portfolio for user 2
    const p2 = await pool.query<{ id: string }>(
      `INSERT INTO portfolios (user_id, name, title, username)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [otherUserId, "Other Portfolio", "Security Analyst", `other_port_${uniqueSuffix}`]
    );
    otherPortfolioId = p2.rows[0]!.id;
  });

  t.after(async () => {
    server.close();
    try {
      for (const pId of createdProjectIds) {
        await pool.query("DELETE FROM projects WHERE id = $1", [pId]);
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
      console.error("Cleanup error in project.api-client.test.ts:", e);
    }
  });

  let createdProjectId = "";

  await t.test("1. createProject client function creates project via API", async () => {
    const payload = {
      title: "API Client Project",
      description: "Tested via frontend API client",
      technologies: ["Next.js", "TypeScript", "TailwindCSS"],
      githubUrl: "https://github.com/foliocraft/demo",
      projectUrl: "https://foliocraft.demo",
      imageUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c",
      orderIndex: 1,
    };

    const res = await createProject(testPortfolioId, payload, testUserJwt);
    assert.ok(res.project);
    assert.ok(res.project.id);
    createdProjectId = res.project.id;
    createdProjectIds.push(createdProjectId);

    assert.equal(res.project.title, payload.title);
    assert.equal(res.project.description, payload.description);
    assert.deepEqual(res.project.technologies, payload.technologies);
    assert.equal(res.project.githubUrl, payload.githubUrl);
    assert.equal(res.project.projectUrl, payload.projectUrl);
    assert.equal(res.project.imageUrl, payload.imageUrl);
    assert.equal(res.project.orderIndex, 1);
    assert.equal(res.project.portfolioId, testPortfolioId);
  });

  await t.test("2. getProjects client function retrieves all projects for portfolio", async () => {
    const res = await getProjects(testPortfolioId, testUserJwt);
    assert.ok(Array.isArray(res.projects));
    assert.ok(res.projects.length >= 1);
    assert.equal(res.projects[0]?.id, createdProjectId);
  });

  await t.test("3. getProject client function retrieves single project by ID", async () => {
    const res = await getProject(createdProjectId, testUserJwt);
    assert.ok(res.project);
    assert.equal(res.project.id, createdProjectId);
    assert.equal(res.project.title, "API Client Project");
  });

  await t.test("4. updateProject client function partially updates project", async () => {
    const res = await updateProject(
      createdProjectId,
      {
        title: "API Client Project Updated",
        orderIndex: 10,
      },
      testUserJwt
    );

    assert.ok(res.project);
    assert.equal(res.project.title, "API Client Project Updated");
    assert.equal(res.project.orderIndex, 10);
    // Preserved fields
    assert.equal(res.project.description, "Tested via frontend API client");
  });

  await t.test("5. createProject client function throws ApiError 401 on invalid/missing auth", async () => {
    await assert.rejects(
      async () => {
        await createProject(testPortfolioId, { title: "No Auth" }, "invalid-token");
      },
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 401);
        return true;
      }
    );
  });

  await t.test("6. createProject client function throws ApiError 403 when modifying another user's portfolio", async () => {
    await assert.rejects(
      async () => {
        await createProject(testPortfolioId, { title: "Intruder" }, otherUserJwt);
      },
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 403);
        assert.equal(err.message, "Unauthorized to modify this portfolio");
        return true;
      }
    );
  });

  await t.test("7. getProjects client function throws ApiError 403 on another user's portfolio", async () => {
    await assert.rejects(
      async () => {
        await getProjects(testPortfolioId, otherUserJwt);
      },
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 403);
        return true;
      }
    );
  });

  await t.test("8. getProject client function throws ApiError 403 on another user's project", async () => {
    await assert.rejects(
      async () => {
        await getProject(createdProjectId, otherUserJwt);
      },
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 403);
        return true;
      }
    );
  });

  await t.test("9. getProject client function throws ApiError 404 on non-existent project", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    await assert.rejects(
      async () => {
        await getProject(fakeId, testUserJwt);
      },
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 404);
        return true;
      }
    );
  });

  await t.test("10. deleteProject client function removes project and subsequent getProject throws 404", async () => {
    const res = await deleteProject(createdProjectId, testUserJwt);
    assert.equal(res.success, true);
    assert.equal(res.id, createdProjectId);

    await assert.rejects(
      async () => {
        await getProject(createdProjectId, testUserJwt);
      },
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 404);
        return true;
      }
    );
  });
});

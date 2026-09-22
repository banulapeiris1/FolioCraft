import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../server";
import { pool } from "../config/database";
import { signToken } from "../utils/auth";
import type { Project } from "../types/project.types";

test("PROJECT-03: Project HTTP Route & API Suite", async (t) => {
  let server: Server;
  let baseUrl: string;

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
    baseUrl = `http://localhost:${address.port}`;

    // Create primary test user
    const u1 = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["Project Route Tester", `proj_route_${uniqueSuffix}@foliocraft.test`, "hashed_dummy_pw"]
    );
    testUserId = u1.rows[0]!.id;
    testUserJwt = signToken({ userId: testUserId });

    // Create second test user for cross-user security checks
    const u2 = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["Other User", `other_proj_${uniqueSuffix}@foliocraft.test`, "hashed_dummy_pw"]
    );
    otherUserId = u2.rows[0]!.id;
    otherUserJwt = signToken({ userId: otherUserId });

    // Create portfolio for primary user
    const p1 = await pool.query<{ id: string }>(
      `INSERT INTO portfolios (user_id, name, title, username)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [testUserId, "Primary User", "Senior FullStack", `prime_${uniqueSuffix}`]
    );
    testPortfolioId = p1.rows[0]!.id;

    // Create portfolio for second user
    const p2 = await pool.query<{ id: string }>(
      `INSERT INTO portfolios (user_id, name, title, username)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [otherUserId, "Other User", "Mobile Developer", `other_${uniqueSuffix}`]
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
      console.error("Cleanup error in project.routes.test.ts:", e);
    }
  });

  let createdProjectId = "";

  // -------------------------------------------------------------
  // POST /api/portfolios/:id/projects
  // -------------------------------------------------------------

  await t.test("1. POST /api/portfolios/:id/projects authenticated user can create project (201 Created)", async () => {
    const payload = {
      title: "FolioCraft Project Builder",
      description: "A showcase of development capabilities.",
      technologies: ["React", "Express", "PostgreSQL"],
      githubUrl: "https://github.com/foliocraft/builder",
      projectUrl: "https://foliocraft.dev/builder",
      imageUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c",
      orderIndex: 0,
    };

    const res = await fetch(`${baseUrl}/api/portfolios/${testPortfolioId}/projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testUserJwt}`,
      },
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 201);
    const body = (await res.json()) as { project: Project };
    assert.ok(body.project);
    createdProjectId = body.project.id;
    createdProjectIds.push(createdProjectId);

    assert.equal(body.project.title, payload.title);
    assert.equal(body.project.description, payload.description);
    assert.deepEqual(body.project.technologies, payload.technologies);
    assert.equal(body.project.githubUrl, payload.githubUrl);
    assert.equal(body.project.projectUrl, payload.projectUrl);
    assert.equal(body.project.imageUrl, payload.imageUrl);
    assert.equal(body.project.orderIndex, 0);
    assert.equal(body.project.portfolioId, testPortfolioId);
  });

  await t.test("2. POST /api/portfolios/:id/projects unauthenticated request returns 401 Unauthorized", async () => {
    const res = await fetch(`${baseUrl}/api/portfolios/${testPortfolioId}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "No Auth Project" }),
    });

    assert.equal(res.status, 401);
    const body = (await res.json()) as { message: string };
    assert.equal(body.message, "Authentication required");
  });

  await t.test("3. POST /api/portfolios/:id/projects user cannot create project in another user's portfolio (403)", async () => {
    // otherUser attempts to create project in testUser's portfolio
    const res = await fetch(`${baseUrl}/api/portfolios/${testPortfolioId}/projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${otherUserJwt}`,
      },
      body: JSON.stringify({ title: "Intrusion Attempt" }),
    });

    assert.equal(res.status, 403);
    const body = (await res.json()) as { message: string };
    assert.equal(body.message, "Unauthorized to modify this portfolio");
  });

  await t.test("4. POST /api/portfolios/:id/projects invalid payload returns 400 Bad Request", async () => {
    // Missing title
    const res = await fetch(`${baseUrl}/api/portfolios/${testPortfolioId}/projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testUserJwt}`,
      },
      body: JSON.stringify({ description: "Missing title" }),
    });

    assert.equal(res.status, 400);
    const body = (await res.json()) as { message: string };
    assert.ok(body.message);
  });

  await t.test("5. POST /api/portfolios/:id/projects non-existent portfolio returns 404 Not Found", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await fetch(`${baseUrl}/api/portfolios/${fakeId}/projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testUserJwt}`,
      },
      body: JSON.stringify({ title: "Ghost Portfolio Project" }),
    });

    assert.equal(res.status, 404);
    const body = (await res.json()) as { message: string };
    assert.equal(body.message, "Portfolio not found");
  });

  // -------------------------------------------------------------
  // GET /api/portfolios/:id/projects
  // -------------------------------------------------------------

  await t.test("6. GET /api/portfolios/:id/projects authenticated owner can retrieve their projects (200 OK)", async () => {
    const res = await fetch(`${baseUrl}/api/portfolios/${testPortfolioId}/projects`, {
      method: "GET",
      headers: { Authorization: `Bearer ${testUserJwt}` },
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as { projects: Project[] };
    assert.ok(Array.isArray(body.projects));
    assert.ok(body.projects.length >= 1);
    assert.equal(body.projects[0]?.id, createdProjectId);
  });

  await t.test("7. GET /api/portfolios/:id/projects unauthenticated request returns 401 Unauthorized", async () => {
    const res = await fetch(`${baseUrl}/api/portfolios/${testPortfolioId}/projects`, {
      method: "GET",
    });

    assert.equal(res.status, 401);
  });

  await t.test("8. GET /api/portfolios/:id/projects another user receives 403 Forbidden", async () => {
    const res = await fetch(`${baseUrl}/api/portfolios/${testPortfolioId}/projects`, {
      method: "GET",
      headers: { Authorization: `Bearer ${otherUserJwt}` },
    });

    assert.equal(res.status, 403);
    const body = (await res.json()) as { message: string };
    assert.equal(body.message, "Unauthorized access to portfolio");
  });

  await t.test("9. GET /api/portfolios/:id/projects non-existent portfolio returns 404 Not Found", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await fetch(`${baseUrl}/api/portfolios/${fakeId}/projects`, {
      method: "GET",
      headers: { Authorization: `Bearer ${testUserJwt}` },
    });

    assert.equal(res.status, 404);
  });

  // -------------------------------------------------------------
  // GET /api/projects/:id
  // -------------------------------------------------------------

  await t.test("10. GET /api/projects/:id authenticated owner can retrieve single project (200 OK)", async () => {
    const res = await fetch(`${baseUrl}/api/projects/${createdProjectId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${testUserJwt}` },
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as { project: Project };
    assert.ok(body.project);
    assert.equal(body.project.id, createdProjectId);
    assert.equal(body.project.title, "FolioCraft Project Builder");
  });

  await t.test("11. GET /api/projects/:id unauthenticated request returns 401 Unauthorized", async () => {
    const res = await fetch(`${baseUrl}/api/projects/${createdProjectId}`, {
      method: "GET",
    });

    assert.equal(res.status, 401);
  });

  await t.test("12. GET /api/projects/:id another user receives 403 Forbidden", async () => {
    const res = await fetch(`${baseUrl}/api/projects/${createdProjectId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${otherUserJwt}` },
    });

    assert.equal(res.status, 403);
    const body = (await res.json()) as { message: string };
    assert.equal(body.message, "Unauthorized access to project");
  });

  await t.test("13. GET /api/projects/:id non-existent project returns 404 Not Found", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await fetch(`${baseUrl}/api/projects/${fakeId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${testUserJwt}` },
    });

    assert.equal(res.status, 404);
  });

  // -------------------------------------------------------------
  // PUT /api/projects/:id
  // -------------------------------------------------------------

  await t.test("14. PUT /api/projects/:id authenticated owner can update project (200 OK)", async () => {
    const updatePayload = {
      title: "FolioCraft Project Builder v2",
      orderIndex: 3,
    };

    const res = await fetch(`${baseUrl}/api/projects/${createdProjectId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testUserJwt}`,
      },
      body: JSON.stringify(updatePayload),
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as { project: Project };
    assert.ok(body.project);
    assert.equal(body.project.title, "FolioCraft Project Builder v2");
    assert.equal(body.project.orderIndex, 3);
    // Preserved fields
    assert.equal(body.project.description, "A showcase of development capabilities.");
  });

  await t.test("15. PUT /api/projects/:id unauthenticated request returns 401 Unauthorized", async () => {
    const res = await fetch(`${baseUrl}/api/projects/${createdProjectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Unauthorized Edit" }),
    });

    assert.equal(res.status, 401);
  });

  await t.test("16. PUT /api/projects/:id another user receives 403 Forbidden", async () => {
    const res = await fetch(`${baseUrl}/api/projects/${createdProjectId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${otherUserJwt}`,
      },
      body: JSON.stringify({ title: "Hacked Title" }),
    });

    assert.equal(res.status, 403);
    const body = (await res.json()) as { message: string };
    assert.equal(body.message, "Unauthorized to modify this project");
  });

  await t.test("17. PUT /api/projects/:id empty body returns 400 Bad Request", async () => {
    const res = await fetch(`${baseUrl}/api/projects/${createdProjectId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testUserJwt}`,
      },
      body: JSON.stringify({}),
    });

    assert.equal(res.status, 400);
    const body = (await res.json()) as { message: string };
    assert.equal(body.message, "No fields provided for update");
  });

  await t.test("18. PUT /api/projects/:id invalid payload returns 400 Bad Request", async () => {
    const res = await fetch(`${baseUrl}/api/projects/${createdProjectId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testUserJwt}`,
      },
      body: JSON.stringify({ title: "   " }),
    });

    assert.equal(res.status, 400);
  });

  await t.test("19. PUT /api/projects/:id non-existent project returns 404 Not Found", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await fetch(`${baseUrl}/api/projects/${fakeId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testUserJwt}`,
      },
      body: JSON.stringify({ title: "Updated Ghost" }),
    });

    assert.equal(res.status, 404);
  });

  // -------------------------------------------------------------
  // DELETE /api/projects/:id
  // -------------------------------------------------------------

  await t.test("20. DELETE /api/projects/:id unauthenticated request returns 401 Unauthorized", async () => {
    const res = await fetch(`${baseUrl}/api/projects/${createdProjectId}`, {
      method: "DELETE",
    });

    assert.equal(res.status, 401);
  });

  await t.test("21. DELETE /api/projects/:id another user receives 403 Forbidden", async () => {
    const res = await fetch(`${baseUrl}/api/projects/${createdProjectId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${otherUserJwt}` },
    });

    assert.equal(res.status, 403);
    const body = (await res.json()) as { message: string };
    assert.equal(body.message, "Unauthorized to delete this project");
  });

  await t.test("22. DELETE /api/projects/:id non-existent project returns 404 Not Found", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await fetch(`${baseUrl}/api/projects/${fakeId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${testUserJwt}` },
    });

    assert.equal(res.status, 404);
  });

  await t.test("23. DELETE /api/projects/:id authenticated owner deletes project (200 OK & subsequent GET 404)", async () => {
    const res = await fetch(`${baseUrl}/api/projects/${createdProjectId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${testUserJwt}` },
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as { success: boolean; id: string };
    assert.equal(body.success, true);
    assert.equal(body.id, createdProjectId);

    // Subsequent GET returns 404
    const getRes = await fetch(`${baseUrl}/api/projects/${createdProjectId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${testUserJwt}` },
    });
    assert.equal(getRes.status, 404);
  });
});

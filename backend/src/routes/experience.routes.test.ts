import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../server";
import { pool } from "../config/database";
import { signToken } from "../utils/auth";
import type { Experience } from "../types/experience.types";

test("EXP-05: Experience HTTP Route & API Suite", async (t) => {
  let server: Server;
  let baseUrl: string;

  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  let testUserId = "";
  let otherUserId = "";
  let testUserJwt = "";
  let otherUserJwt = "";
  let testPortfolioId = "";
  let otherPortfolioId = "";
  const createdExperienceIds: string[] = [];

  t.before(async () => {
    server = app.listen(0);
    const address = server.address() as AddressInfo;
    baseUrl = `http://localhost:${address.port}`;

    // Create primary test user
    const u1 = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["Experience Route Tester", `exp_route_${uniqueSuffix}@foliocraft.test`, "hashed_pw"]
    );
    testUserId = u1.rows[0]!.id;
    testUserJwt = signToken({ userId: testUserId });

    // Create second test user for cross-user security checks
    const u2 = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["Other Experience User", `other_exp_${uniqueSuffix}@foliocraft.test`, "hashed_pw"]
    );
    otherUserId = u2.rows[0]!.id;
    otherUserJwt = signToken({ userId: otherUserId });

    // Create portfolio for primary user
    const p1 = await pool.query<{ id: string }>(
      `INSERT INTO portfolios (user_id, name, title, username)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [testUserId, "Primary User", "Staff Engineer", `exp_prime_${uniqueSuffix}`]
    );
    testPortfolioId = p1.rows[0]!.id;

    // Create portfolio for second user
    const p2 = await pool.query<{ id: string }>(
      `INSERT INTO portfolios (user_id, name, title, username)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [otherUserId, "Other User", "Product Designer", `exp_other_${uniqueSuffix}`]
    );
    otherPortfolioId = p2.rows[0]!.id;
  });

  t.after(async () => {
    server.close();
    try {
      for (const eId of createdExperienceIds) {
        await pool.query("DELETE FROM experience WHERE id = $1", [eId]);
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
      console.error("Cleanup error in experience.routes.test.ts:", e);
    }
  });

  let createdExperienceId = "";

  // -------------------------------------------------------------
  // POST /api/portfolios/:id/experience
  // -------------------------------------------------------------

  await t.test(
    "1. POST /api/portfolios/:id/experience authenticated user can create experience (201 Created)",
    async () => {
      const payload = {
        company: "Vercel",
        position: "Principal Cloud Architect",
        description: "Designing edge compute and deployment engines.",
        startDate: "2021-06-01",
        endDate: "2023-12-31",
        isCurrent: false,
      };

      const res = await fetch(`${baseUrl}/api/portfolios/${testPortfolioId}/experience`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${testUserJwt}`,
        },
        body: JSON.stringify(payload),
      });

      assert.equal(res.status, 201);
      const data = (await res.json()) as { experience: Experience };
      assert.ok(data.experience);
      assert.equal(data.experience.company, "Vercel");
      assert.equal(data.experience.position, "Principal Cloud Architect");
      assert.equal(data.experience.startDate, "2021-06-01");
      assert.equal(data.experience.endDate, "2023-12-31");
      assert.equal(data.experience.isCurrent, false);
      assert.equal(data.experience.portfolioId, testPortfolioId);

      createdExperienceId = data.experience.id;
      createdExperienceIds.push(createdExperienceId);
    }
  );

  await t.test(
    "2. POST /api/portfolios/:id/experience with isCurrent=true normalizes and returns null endDate (201 Created)",
    async () => {
      const payload = {
        company: "Current Labs",
        position: "Lead Architect",
        startDate: "2024-01-01",
        endDate: "2025-12-31", // Even if supplied, must be normalized
        isCurrent: true,
      };

      const res = await fetch(`${baseUrl}/api/portfolios/${testPortfolioId}/experience`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${testUserJwt}`,
        },
        body: JSON.stringify(payload),
      });

      assert.equal(res.status, 201);
      const data = (await res.json()) as { experience: Experience };
      assert.ok(data.experience);
      assert.equal(data.experience.company, "Current Labs");
      assert.equal(data.experience.isCurrent, true);
      assert.equal(data.experience.endDate, null);

      createdExperienceIds.push(data.experience.id);
    }
  );

  await t.test(
    "3. POST /api/portfolios/:id/experience unauthenticated request returns 401 Unauthorized",
    async () => {
      const res = await fetch(`${baseUrl}/api/portfolios/${testPortfolioId}/experience`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: "No Auth Inc",
          position: "Dev",
          startDate: "2023-01-01",
        }),
      });

      assert.equal(res.status, 401);
    }
  );

  await t.test(
    "4. POST /api/portfolios/:id/experience validation failure returns 400 Bad Request",
    async () => {
      // Missing company
      const res = await fetch(`${baseUrl}/api/portfolios/${testPortfolioId}/experience`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${testUserJwt}`,
        },
        body: JSON.stringify({
          position: "Engineer",
          startDate: "2023-01-01",
        }),
      });

      assert.equal(res.status, 400);
      const data = (await res.json()) as { message: string };
      assert.ok(data.message.includes("Company is required"));
    }
  );

  await t.test(
    "5. POST /api/portfolios/:id/experience modifying another user's portfolio returns 403 Forbidden",
    async () => {
      const res = await fetch(`${baseUrl}/api/portfolios/${otherPortfolioId}/experience`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${testUserJwt}`,
        },
        body: JSON.stringify({
          company: "Unauthorized Co",
          position: "Hacker",
          startDate: "2023-01-01",
        }),
      });

      assert.equal(res.status, 403);
    }
  );

  await t.test(
    "6. POST /api/portfolios/:id/experience on non-existent portfolio returns 404 Not Found",
    async () => {
      const nonExistentPortId = "55555555-5555-5555-5555-555555555555";
      const res = await fetch(`${baseUrl}/api/portfolios/${nonExistentPortId}/experience`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${testUserJwt}`,
        },
        body: JSON.stringify({
          company: "Missing Co",
          position: "Dev",
          startDate: "2023-01-01",
        }),
      });

      assert.equal(res.status, 404);
    }
  );

  // -------------------------------------------------------------
  // GET /api/portfolios/:id/experience
  // -------------------------------------------------------------

  await t.test(
    "7. GET /api/portfolios/:id/experience authenticated owner retrieves experiences (200 OK)",
    async () => {
      const res = await fetch(`${baseUrl}/api/portfolios/${testPortfolioId}/experience`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${testUserJwt}`,
        },
      });

      assert.equal(res.status, 200);
      const data = (await res.json()) as { experience: Experience[]; experiences: Experience[] };
      assert.ok(Array.isArray(data.experience));
      assert.ok(Array.isArray(data.experiences));
      assert.ok(data.experience.length >= 2);
      // Active role first
      assert.equal(data.experience[0]!.isCurrent, true);
    }
  );

  await t.test(
    "8. GET /api/portfolios/:id/experiences plural alias endpoint returns 200 OK",
    async () => {
      const res = await fetch(`${baseUrl}/api/portfolios/${testPortfolioId}/experiences`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${testUserJwt}`,
        },
      });

      assert.equal(res.status, 200);
      const data = (await res.json()) as { experience: Experience[] };
      assert.ok(Array.isArray(data.experience));
    }
  );

  await t.test(
    "9. GET /api/portfolios/:id/experience unauthenticated returns 401 Unauthorized",
    async () => {
      const res = await fetch(`${baseUrl}/api/portfolios/${testPortfolioId}/experience`);
      assert.equal(res.status, 401);
    }
  );

  await t.test(
    "10. GET /api/portfolios/:id/experience another user receives 403 Forbidden",
    async () => {
      const res = await fetch(`${baseUrl}/api/portfolios/${testPortfolioId}/experience`, {
        headers: {
          Authorization: `Bearer ${otherUserJwt}`,
        },
      });
      assert.equal(res.status, 403);
    }
  );

  // -------------------------------------------------------------
  // GET /api/experience/:id
  // -------------------------------------------------------------

  await t.test(
    "11. GET /api/experience/:id authenticated owner retrieves single record (200 OK)",
    async () => {
      const res = await fetch(`${baseUrl}/api/experience/${createdExperienceId}`, {
        headers: {
          Authorization: `Bearer ${testUserJwt}`,
        },
      });

      assert.equal(res.status, 200);
      const data = (await res.json()) as { experience: Experience };
      assert.equal(data.experience.id, createdExperienceId);
      assert.equal(data.experience.company, "Vercel");
    }
  );

  await t.test(
    "12. GET /api/experience/:id missing record returns 404 Not Found",
    async () => {
      const res = await fetch(
        `${baseUrl}/api/experience/66666666-6666-6666-6666-666666666666`,
        {
          headers: {
            Authorization: `Bearer ${testUserJwt}`,
          },
        }
      );

      assert.equal(res.status, 404);
    }
  );

  await t.test(
    "13. GET /api/experience/:id unauthorized user accessing another's record returns 403 Forbidden",
    async () => {
      const res = await fetch(`${baseUrl}/api/experience/${createdExperienceId}`, {
        headers: {
          Authorization: `Bearer ${otherUserJwt}`,
        },
      });

      assert.equal(res.status, 403);
    }
  );

  // -------------------------------------------------------------
  // PUT /api/experience/:id
  // -------------------------------------------------------------

  await t.test(
    "14. PUT /api/experience/:id authenticated owner partially updates record (200 OK)",
    async () => {
      const updateBody = {
        position: "VP of Engineering",
        description: "Promoted to lead global infrastructure organization.",
      };

      const res = await fetch(`${baseUrl}/api/experience/${createdExperienceId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${testUserJwt}`,
        },
        body: JSON.stringify(updateBody),
      });

      assert.equal(res.status, 200);
      const data = (await res.json()) as { experience: Experience };
      assert.equal(data.experience.id, createdExperienceId);
      assert.equal(data.experience.position, "VP of Engineering");
      assert.equal(
        data.experience.description,
        "Promoted to lead global infrastructure organization."
      );
      assert.equal(data.experience.company, "Vercel"); // Preserved
    }
  );

  await t.test(
    "15. PUT /api/experience/:id with empty body returns 400 Bad Request",
    async () => {
      const res = await fetch(`${baseUrl}/api/experience/${createdExperienceId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${testUserJwt}`,
        },
        body: JSON.stringify({}),
      });

      assert.equal(res.status, 400);
      const data = (await res.json()) as { message: string };
      assert.ok(data.message.includes("No fields provided for update"));
    }
  );

  await t.test(
    "16. PUT /api/experience/:id date range conflict returns 400 Bad Request",
    async () => {
      // Attempting to set startDate after existing endDate (2023-12-31)
      const res = await fetch(`${baseUrl}/api/experience/${createdExperienceId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${testUserJwt}`,
        },
        body: JSON.stringify({
          startDate: "2024-05-01",
        }),
      });

      assert.equal(res.status, 400);
      const data = (await res.json()) as { message: string };
      assert.ok(data.message.includes("End date must be on or after start date"));
    }
  );

  await t.test(
    "17. PUT /api/experience/:id another user receives 403 Forbidden",
    async () => {
      const res = await fetch(`${baseUrl}/api/experience/${createdExperienceId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${otherUserJwt}`,
        },
        body: JSON.stringify({
          company: "Malicious Co",
        }),
      });

      assert.equal(res.status, 403);
    }
  );

  // -------------------------------------------------------------
  // DELETE /api/experience/:id
  // -------------------------------------------------------------

  await t.test(
    "18. DELETE /api/experience/:id authenticated owner deletes record (200 OK)",
    async () => {
      // Create temporary record to delete
      const createRes = await fetch(`${baseUrl}/api/portfolios/${testPortfolioId}/experience`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${testUserJwt}`,
        },
        body: JSON.stringify({
          company: "Temp Co",
          position: "Intern",
          startDate: "2022-01-01",
        }),
      });
      const createdData = (await createRes.json()) as { experience: Experience };

      const deleteRes = await fetch(`${baseUrl}/api/experience/${createdData.experience.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${testUserJwt}`,
        },
      });

      assert.equal(deleteRes.status, 200);
      const deleteResult = (await deleteRes.json()) as { success: boolean; id: string };
      assert.equal(deleteResult.success, true);
      assert.equal(deleteResult.id, createdData.experience.id);

      // Verify subsequent GET returns 404
      const getRes = await fetch(`${baseUrl}/api/experience/${createdData.experience.id}`, {
        headers: {
          Authorization: `Bearer ${testUserJwt}`,
        },
      });
      assert.equal(getRes.status, 404);
    }
  );

  await t.test(
    "19. DELETE /api/experience/:id unauthenticated request returns 401 Unauthorized",
    async () => {
      const res = await fetch(`${baseUrl}/api/experience/${createdExperienceId}`, {
        method: "DELETE",
      });
      assert.equal(res.status, 401);
    }
  );

  await t.test(
    "20. DELETE /api/experience/:id another user receives 403 Forbidden",
    async () => {
      const res = await fetch(`${baseUrl}/api/experience/${createdExperienceId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${otherUserJwt}`,
        },
      });
      assert.equal(res.status, 403);
    }
  );

  await t.test(
    "21. DELETE /api/experience/:id missing record returns 404 Not Found",
    async () => {
      const res = await fetch(
        `${baseUrl}/api/experience/77777777-7777-7777-7777-777777777777`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${testUserJwt}`,
          },
        }
      );
      assert.equal(res.status, 404);
    }
  );
});

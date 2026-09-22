import test from "node:test";
import assert from "node:assert/strict";
import { pool } from "../config/database";
import { projectService } from "./project.service";
import { AppError } from "../utils/errors";
import {
  createProjectSchema,
  updateProjectSchema,
} from "../utils/validation";


test("PROJECT-02: Project Backend Service Integration Suite", async (t) => {
  const uniqueTag = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const user1Email = `proj_user1_${uniqueTag}@foliocraft.test`;
  const user2Email = `proj_user2_${uniqueTag}@foliocraft.test`;

  let user1Id = "";
  let user2Id = "";
  let portfolio1Id = "";
  let portfolio2Id = "";
  const createdProjectIds: string[] = [];

  t.before(async () => {
    // 1. Create 2 test users for ownership isolation testing
    const u1 = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["Project Owner One", user1Email, "hashed_pw"]
    );
    user1Id = u1.rows[0]!.id;

    const u2 = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["Project Owner Two", user2Email, "hashed_pw"]
    );
    user2Id = u2.rows[0]!.id;

    // 2. Create a portfolio for each user
    const p1 = await pool.query<{ id: string }>(
      `INSERT INTO portfolios (user_id, name, title, username)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [user1Id, "Portfolio One", "Lead Engineer", `port1_${uniqueTag}`]
    );
    portfolio1Id = p1.rows[0]!.id;

    const p2 = await pool.query<{ id: string }>(
      `INSERT INTO portfolios (user_id, name, title, username)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [user2Id, "Portfolio Two", "DevOps Engineer", `port2_${uniqueTag}`]
    );
    portfolio2Id = p2.rows[0]!.id;
  });

  t.after(async () => {
    try {
      for (const pId of createdProjectIds) {
        await pool.query("DELETE FROM projects WHERE id = $1", [pId]);
      }
      if (portfolio1Id) {
        await pool.query("DELETE FROM portfolios WHERE id = $1", [portfolio1Id]);
      }
      if (portfolio2Id) {
        await pool.query("DELETE FROM portfolios WHERE id = $1", [portfolio2Id]);
      }
      if (user1Id) {
        await pool.query("DELETE FROM users WHERE id = $1", [user1Id]);
      }
      if (user2Id) {
        await pool.query("DELETE FROM users WHERE id = $1", [user2Id]);
      }
    } catch (err) {
      console.error("Cleanup error in project.service.test.ts:", err);
    }
  });

  let project1Id = "";

  await t.test("1. createProject successfully creates project belonging to portfolio with all fields & JSONB", async () => {
    const techStack = ["Next.js", "TypeScript", "TailwindCSS", "PostgreSQL"];
    const created = await projectService.createProject(portfolio1Id, user1Id, {
      title: "FolioCraft Core",
      description: "Comprehensive portfolio builder web application.",
      technologies: techStack,
      githubUrl: "https://github.com/foliocraft/core",
      projectUrl: "https://foliocraft.dev",
      imageUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c",
      orderIndex: 0,
    });

    assert.ok(created.id);
    project1Id = created.id;
    createdProjectIds.push(created.id);

    assert.equal(created.portfolioId, portfolio1Id);
    assert.equal(created.title, "FolioCraft Core");
    assert.equal(created.description, "Comprehensive portfolio builder web application.");
    assert.deepEqual(created.technologies, techStack);
    assert.equal(created.githubUrl, "https://github.com/foliocraft/core");
    assert.equal(created.projectUrl, "https://foliocraft.dev");
    assert.equal(created.imageUrl, "https://images.unsplash.com/photo-1555066931-4365d14bab8c");
    assert.equal(created.orderIndex, 0);
    assert.ok(created.createdAt instanceof Date);
    assert.ok(created.updatedAt instanceof Date);
  });

  await t.test("2. createProject handles default orderIndex 0 and empty technologies when omitted", async () => {
    const minimal = await projectService.createProject(portfolio1Id, user1Id, {
      title: "Minimal Project",
    });

    assert.ok(minimal.id);
    createdProjectIds.push(minimal.id);
    assert.equal(minimal.title, "Minimal Project");
    assert.equal(minimal.orderIndex, 0);
    assert.deepEqual(minimal.technologies, []);
    assert.equal(minimal.description, null);
    assert.equal(minimal.githubUrl, null);
    assert.equal(minimal.projectUrl, null);
    assert.equal(minimal.imageUrl, null);
  });

  await t.test("3. createProject rejects validation errors (missing title, invalid orderIndex, invalid userId/portfolioId)", async () => {
    // Missing title
    await assert.rejects(
      async () => {
        await projectService.createProject(portfolio1Id, user1Id, { title: "" });
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 400);
        assert.equal(err.message, "Title is required");
        return true;
      }
    );

    // Negative orderIndex
    await assert.rejects(
      async () => {
        await projectService.createProject(portfolio1Id, user1Id, {
          title: "Bad Order",
          orderIndex: -1,
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 400);
        assert.equal(err.message, "Order index must be a non-negative integer");
        return true;
      }
    );

    // Invalid UUID for portfolioId
    await assert.rejects(
      async () => {
        await projectService.createProject("not-a-uuid", user1Id, { title: "Test" });
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 404);
        assert.equal(err.message, "Portfolio not found");
        return true;
      }
    );

    // Invalid UUID for userId
    await assert.rejects(
      async () => {
        await projectService.createProject(portfolio1Id, "not-a-uuid", { title: "Test" });
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 400);
        assert.equal(err.message, "Invalid user ID");
        return true;
      }
    );
  });

  await t.test("4. createProject rejects creation under non-existent portfolio (404)", async () => {
    const fakePortfolioId = "a0000000-0000-0000-0000-000000000000";
    await assert.rejects(
      async () => {
        await projectService.createProject(fakePortfolioId, user1Id, { title: "Test" });
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 404);
        assert.equal(err.message, "Portfolio not found");
        return true;
      }
    );
  });

  await t.test("5. createProject ownership check: user cannot create project in another user's portfolio (403)", async () => {
    await assert.rejects(
      async () => {
        // user2 attempts to create project in user1's portfolio
        await projectService.createProject(portfolio1Id, user2Id, {
          title: "Intruder Project",
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 403);
        assert.equal(err.message, "Unauthorized to modify this portfolio");
        return true;
      }
    );
  });

  await t.test("6. getProjectsByPortfolio returns projects ordered by orderIndex ASC, created_at DESC", async () => {
    // portfolio1 currently has 2 projects: project1 (orderIndex 0) and minimal (orderIndex 0)
    // Add a 3rd project with orderIndex 2
    const pThird = await projectService.createProject(portfolio1Id, user1Id, {
      title: "Third Project",
      orderIndex: 2,
    });
    createdProjectIds.push(pThird.id);

    const projects = await projectService.getProjectsByPortfolio(portfolio1Id, user1Id);
    assert.ok(projects.length >= 3);
    assert.equal(projects[0]?.orderIndex, 0);
    // The one with orderIndex 2 should be at the end
    assert.equal(projects[projects.length - 1]?.orderIndex, 2);
  });

  await t.test("7. getProjectsByPortfolio throws 404 for non-existent portfolio", async () => {
    const fakePortfolioId = "b0000000-0000-0000-0000-000000000000";
    await assert.rejects(
      async () => {
        await projectService.getProjectsByPortfolio(fakePortfolioId, user1Id);
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 404);
        assert.equal(err.message, "Portfolio not found");
        return true;
      }
    );
  });

  await t.test("8. getProjectsByPortfolio ownership check: another user receives 403", async () => {
    await assert.rejects(
      async () => {
        await projectService.getProjectsByPortfolio(portfolio1Id, user2Id);
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 403);
        assert.equal(err.message, "Unauthorized access to portfolio");
        return true;
      }
    );
  });

  await t.test("9. getProjectById returns the correct project", async () => {
    const fetched = await projectService.getProjectById(project1Id, user1Id);
    assert.equal(fetched.id, project1Id);
    assert.equal(fetched.title, "FolioCraft Core");
    assert.equal(fetched.portfolioId, portfolio1Id);
  });

  await t.test("10. getProjectById throws 404 for non-existent or invalid project ID", async () => {
    const fakeProjectId = "c0000000-0000-0000-0000-000000000000";
    await assert.rejects(
      async () => {
        await projectService.getProjectById(fakeProjectId, user1Id);
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 404);
        assert.equal(err.message, "Project not found");
        return true;
      }
    );
  });

  await t.test("11. getProjectById ownership check: another user receives 403", async () => {
    await assert.rejects(
      async () => {
        await projectService.getProjectById(project1Id, user2Id);
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 403);
        assert.equal(err.message, "Unauthorized access to project");
        return true;
      }
    );
  });

  await t.test("12. updateProject partially updates supplied fields and preserves unspecified fields", async () => {
    const updated = await projectService.updateProject(project1Id, user1Id, {
      title: "FolioCraft Core v2",
      orderIndex: 5,
    });

    assert.equal(updated.id, project1Id);
    assert.equal(updated.title, "FolioCraft Core v2");
    assert.equal(updated.orderIndex, 5);
    // Preserved fields
    assert.equal(updated.description, "Comprehensive portfolio builder web application.");
    assert.deepEqual(updated.technologies, ["Next.js", "TypeScript", "TailwindCSS", "PostgreSQL"]);
    assert.equal(updated.githubUrl, "https://github.com/foliocraft/core");
    assert.equal(updated.projectUrl, "https://foliocraft.dev");
    assert.ok(updated.updatedAt >= updated.createdAt);
  });

  await t.test("13. updateProject rejects invalid values (empty title, negative orderIndex)", async () => {
    await assert.rejects(
      async () => {
        await projectService.updateProject(project1Id, user1Id, { title: "   " });
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 400);
        assert.equal(err.message, "Title cannot be empty");
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await projectService.updateProject(project1Id, user1Id, { orderIndex: -5 });
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 400);
        assert.equal(err.message, "Order index must be a non-negative integer");
        return true;
      }
    );
  });

  await t.test("14. updateProject ownership check: another user receives 403", async () => {
    await assert.rejects(
      async () => {
        await projectService.updateProject(project1Id, user2Id, {
          title: "Malicious Update",
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 403);
        assert.equal(err.message, "Unauthorized to modify this project");
        return true;
      }
    );
  });

  await t.test("15. updateProject throws 404 for non-existent project", async () => {
    const fakeProjectId = "d0000000-0000-0000-0000-000000000000";
    await assert.rejects(
      async () => {
        await projectService.updateProject(fakeProjectId, user1Id, { title: "New" });
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 404);
        assert.equal(err.message, "Project not found");
        return true;
      }
    );
  });

  await t.test("16. deleteProject ownership check: another user receives 403 and project remains untouched", async () => {
    await assert.rejects(
      async () => {
        await projectService.deleteProject(project1Id, user2Id);
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 403);
        assert.equal(err.message, "Unauthorized to delete this project");
        return true;
      }
    );

    // Confirm it still exists
    const check = await projectService.getProjectById(project1Id, user1Id);
    assert.equal(check.id, project1Id);
  });

  await t.test("17. deleteProject throws 404 for non-existent project", async () => {
    const fakeProjectId = "e0000000-0000-0000-0000-000000000000";
    await assert.rejects(
      async () => {
        await projectService.deleteProject(fakeProjectId, user1Id);
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 404);
        assert.equal(err.message, "Project not found");
        return true;
      }
    );
  });

  await t.test("18. deleteProject successfully deletes the project and returns success", async () => {
    const result = await projectService.deleteProject(project1Id, user1Id);
    assert.equal(result.success, true);
    assert.equal(result.id, project1Id);

    // Verify it is gone
    await assert.rejects(
      async () => {
        await projectService.getProjectById(project1Id, user1Id);
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 404);
        assert.equal(err.message, "Project not found");
        return true;
      }
    );
  });

  await t.test("19. createProjectSchema correctly validates valid payloads and rejects invalid formats", () => {
    // Valid full payload
    const valid = createProjectSchema.safeParse({
      title: "Valid Project",
      description: "Sample description",
      technologies: ["React", "TypeScript"],
      githubUrl: "https://github.com/example/repo",
      projectUrl: "https://example.com",
      imageUrl: "https://example.com/image.png",
      orderIndex: 0,
    });
    assert.equal(valid.success, true);

    // Missing title
    const missingTitle = createProjectSchema.safeParse({
      description: "No title",
    });
    assert.equal(missingTitle.success, false);

    // Negative order index
    const negOrder = createProjectSchema.safeParse({
      title: "Valid Title",
      orderIndex: -1,
    });
    assert.equal(negOrder.success, false);

    // Non-integer order index
    const floatOrder = createProjectSchema.safeParse({
      title: "Valid Title",
      orderIndex: 1.5,
    });
    assert.equal(floatOrder.success, false);
  });

  await t.test("20. updateProjectSchema correctly handles partial updates and rejects invalid fields", () => {
    // Valid partial
    const validPartial = updateProjectSchema.safeParse({
      title: "Updated Title",
      orderIndex: 3,
    });
    assert.equal(validPartial.success, true);

    // Empty title
    const emptyTitle = updateProjectSchema.safeParse({
      title: "   ",
    });
    assert.equal(emptyTitle.success, false);

    // Negative orderIndex
    const negOrder = updateProjectSchema.safeParse({
      orderIndex: -2,
    });
    assert.equal(negOrder.success, false);
  });
});


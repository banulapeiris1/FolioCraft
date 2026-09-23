import test from "node:test";
import assert from "node:assert/strict";
import { pool } from "../config/database";
import { skillService } from "./skill.service";
import { AppError } from "../utils/errors";
import {
  createSkillSchema,
  updateSkillSchema,
} from "../utils/validation";

test("SKILL-02: Skill Backend Service Integration Suite", async (t) => {
  const uniqueTag = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const user1Email = `skill_user1_${uniqueTag}@foliocraft.test`;
  const user2Email = `skill_user2_${uniqueTag}@foliocraft.test`;

  let user1Id = "";
  let user2Id = "";
  let portfolio1Id = "";
  let portfolio2Id = "";
  const createdSkillIds: string[] = [];

  t.before(async () => {
    // 1. Create 2 test users for ownership isolation testing
    const u1 = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["Skill Owner One", user1Email, "hashed_pw"]
    );
    user1Id = u1.rows[0]!.id;

    const u2 = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["Skill Owner Two", user2Email, "hashed_pw"]
    );
    user2Id = u2.rows[0]!.id;

    // 2. Create a portfolio for each user
    const p1 = await pool.query<{ id: string }>(
      `INSERT INTO portfolios (user_id, name, title, username)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [user1Id, "Skill Portfolio One", "Lead Engineer", `skillport1_${uniqueTag}`]
    );
    portfolio1Id = p1.rows[0]!.id;

    const p2 = await pool.query<{ id: string }>(
      `INSERT INTO portfolios (user_id, name, title, username)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [user2Id, "Skill Portfolio Two", "DevOps Engineer", `skillport2_${uniqueTag}`]
    );
    portfolio2Id = p2.rows[0]!.id;
  });

  t.after(async () => {
    try {
      for (const sId of createdSkillIds) {
        await pool.query("DELETE FROM skills WHERE id = $1", [sId]);
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
      console.error("Cleanup error in skill.service.test.ts:", err);
    }
  });

  let skill1Id = "";

  // -------------------------------------------------------------------------
  // CREATE TESTS
  // -------------------------------------------------------------------------
  await t.test("1. createSkill successfully creates skill belonging to portfolio with all mapped fields", async () => {
    const created = await skillService.createSkill(user1Id, portfolio1Id, {
      name: "TypeScript",
      category: "Programming Languages",
      orderIndex: 0,
    });

    assert.ok(created.id, "Expected generated UUID id");
    skill1Id = created.id;
    createdSkillIds.push(created.id);

    assert.equal(created.portfolioId, portfolio1Id);
    assert.equal(created.name, "TypeScript");
    assert.equal(created.category, "Programming Languages");
    assert.equal(created.orderIndex, 0);
    assert.ok(created.createdAt instanceof Date);
    assert.ok(created.updatedAt instanceof Date);
  });

  await t.test("2. createSkill handles default orderIndex 0 when omitted", async () => {
    const created = await skillService.createSkill(user1Id, portfolio1Id, {
      name: "Node.js",
      category: "Backend",
    });

    assert.ok(created.id);
    createdSkillIds.push(created.id);
    assert.equal(created.orderIndex, 0, "Default orderIndex should be 0");
    assert.equal(created.name, "Node.js");
    assert.equal(created.category, "Backend");
  });

  await t.test("3. createSkill rejects validation errors (missing name, name > 100, missing category, category > 50, invalid orderIndex)", async () => {
    // Missing / empty name
    await assert.rejects(
      async () => {
        await skillService.createSkill(user1Id, portfolio1Id, {
          name: "",
          category: "Backend",
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /name is required/i);
        return true;
      }
    );

    // Name > 100 characters
    await assert.rejects(
      async () => {
        await skillService.createSkill(user1Id, portfolio1Id, {
          name: "A".repeat(101),
          category: "Backend",
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /name cannot exceed 100 characters/i);
        return true;
      }
    );

    // Missing / empty category
    await assert.rejects(
      async () => {
        await skillService.createSkill(user1Id, portfolio1Id, {
          name: "React",
          category: "",
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /category is required/i);
        return true;
      }
    );

    // Category > 50 characters
    await assert.rejects(
      async () => {
        await skillService.createSkill(user1Id, portfolio1Id, {
          name: "React",
          category: "C".repeat(51),
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /category cannot exceed 50 characters/i);
        return true;
      }
    );

    // Negative orderIndex
    await assert.rejects(
      async () => {
        await skillService.createSkill(user1Id, portfolio1Id, {
          name: "React",
          category: "Frontend",
          orderIndex: -1,
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /non-negative/i);
        return true;
      }
    );
  });

  await t.test("4. createSkill rejects creation under non-existent portfolio (404)", async () => {
    const fakePortfolioId = "00000000-0000-0000-0000-000000000000";
    await assert.rejects(
      async () => {
        await skillService.createSkill(user1Id, fakePortfolioId, {
          name: "Docker",
          category: "DevOps",
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 404);
        assert.match(err.message, /portfolio not found/i);
        return true;
      }
    );
  });

  await t.test("5. createSkill ownership check: user cannot create skill in another user's portfolio (403)", async () => {
    // user2 attempts to create skill under user1's portfolio
    await assert.rejects(
      async () => {
        await skillService.createSkill(user2Id, portfolio1Id, {
          name: "PostgreSQL",
          category: "Databases",
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /unauthorized to modify this portfolio/i);
        return true;
      }
    );
  });

  // -------------------------------------------------------------------------
  // GET LIST TESTS
  // -------------------------------------------------------------------------
  await t.test("6. getSkills returns skills ordered by orderIndex ASC, created_at DESC", async () => {
    // Add two more skills with varying orderIndex
    const s2 = await skillService.createSkill(user1Id, portfolio1Id, {
      name: "GraphQL",
      category: "Backend",
      orderIndex: 2,
    });
    createdSkillIds.push(s2.id);

    const s3 = await skillService.createSkill(user1Id, portfolio1Id, {
      name: "React",
      category: "Frontend",
      orderIndex: 1,
    });
    createdSkillIds.push(s3.id);

    const skills = await skillService.getSkills(user1Id, portfolio1Id);
    assert.ok(Array.isArray(skills));
    assert.ok(skills.length >= 3);

    // Verify ordering by orderIndex ASC
    for (let i = 0; i < skills.length - 1; i++) {
      assert.ok(
        skills[i]!.orderIndex <= skills[i + 1]!.orderIndex,
        `Expected orderIndex ${skills[i]!.orderIndex} <= ${skills[i + 1]!.orderIndex}`
      );
    }
  });

  await t.test("7. getSkills throws 404 for non-existent portfolio", async () => {
    const fakePortfolioId = "00000000-0000-0000-0000-000000000000";
    await assert.rejects(
      async () => {
        await skillService.getSkills(user1Id, fakePortfolioId);
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 404);
        return true;
      }
    );
  });

  await t.test("8. getSkills ownership check: another user receives 403", async () => {
    await assert.rejects(
      async () => {
        await skillService.getSkills(user2Id, portfolio1Id);
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /unauthorized access to portfolio/i);
        return true;
      }
    );
  });

  // -------------------------------------------------------------------------
  // GET SINGLE TESTS
  // -------------------------------------------------------------------------
  await t.test("9. getSkillById returns the correct skill for owner", async () => {
    const skill = await skillService.getSkillById(user1Id, skill1Id);
    assert.equal(skill.id, skill1Id);
    assert.equal(skill.portfolioId, portfolio1Id);
    assert.equal(skill.name, "TypeScript");
    assert.equal(skill.category, "Programming Languages");
  });

  await t.test("10. getSkillById throws 404 for non-existent or invalid skill ID", async () => {
    const fakeSkillId = "00000000-0000-0000-0000-000000000000";
    await assert.rejects(
      async () => {
        await skillService.getSkillById(user1Id, fakeSkillId);
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 404);
        return true;
      }
    );
  });

  await t.test("11. getSkillById ownership check: another user receives 403", async () => {
    await assert.rejects(
      async () => {
        await skillService.getSkillById(user2Id, skill1Id);
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /unauthorized access to skill/i);
        return true;
      }
    );
  });

  // -------------------------------------------------------------------------
  // UPDATE TESTS
  // -------------------------------------------------------------------------
  await t.test("12. updateSkill partially updates supplied fields and preserves unspecified fields", async () => {
    const beforeUpdate = await skillService.getSkillById(user1Id, skill1Id);

    // Wait slightly to verify updatedAt timestamp advances
    await new Promise((resolve) => setTimeout(resolve, 50));

    const updated = await skillService.updateSkill(user1Id, skill1Id, {
      name: "TypeScript 5",
      orderIndex: 5,
    });

    assert.equal(updated.id, skill1Id);
    assert.equal(updated.name, "TypeScript 5");
    assert.equal(updated.category, beforeUpdate.category, "Category should be preserved");
    assert.equal(updated.orderIndex, 5);
    assert.equal(updated.portfolioId, portfolio1Id, "portfolioId cannot be changed");
    assert.ok(
      updated.updatedAt.getTime() >= beforeUpdate.updatedAt.getTime(),
      "updatedAt should advance"
    );
  });

  await t.test("13. updateSkill rejects invalid values (empty name, name > 100, empty category, category > 50, negative orderIndex)", async () => {
    await assert.rejects(
      async () => {
        await skillService.updateSkill(user1Id, skill1Id, { name: "   " });
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /name cannot be empty/i);
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await skillService.updateSkill(user1Id, skill1Id, { name: "X".repeat(101) });
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /name cannot exceed 100 characters/i);
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await skillService.updateSkill(user1Id, skill1Id, { category: "   " });
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /category cannot be empty/i);
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await skillService.updateSkill(user1Id, skill1Id, { category: "Y".repeat(51) });
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /category cannot exceed 50 characters/i);
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await skillService.updateSkill(user1Id, skill1Id, { orderIndex: -5 });
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /non-negative/i);
        return true;
      }
    );
  });

  await t.test("14. updateSkill ownership check: another user receives 403", async () => {
    await assert.rejects(
      async () => {
        await skillService.updateSkill(user2Id, skill1Id, { name: "Hacked Skill" });
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /unauthorized to modify this skill/i);
        return true;
      }
    );
  });

  await t.test("15. updateSkill throws 404 for non-existent skill", async () => {
    const fakeSkillId = "00000000-0000-0000-0000-000000000000";
    await assert.rejects(
      async () => {
        await skillService.updateSkill(user1Id, fakeSkillId, { name: "Phantom Skill" });
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 404);
        return true;
      }
    );
  });

  // -------------------------------------------------------------------------
  // DELETE TESTS
  // -------------------------------------------------------------------------
  await t.test("16. deleteSkill ownership check: another user receives 403 and skill remains untouched", async () => {
    await assert.rejects(
      async () => {
        await skillService.deleteSkill(user2Id, skill1Id);
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 403);
        assert.match(err.message, /unauthorized to delete this skill/i);
        return true;
      }
    );

    // Verify still exists
    const stillExists = await skillService.getSkillById(user1Id, skill1Id);
    assert.equal(stillExists.id, skill1Id);
  });

  await t.test("17. deleteSkill throws 404 for non-existent skill", async () => {
    const fakeSkillId = "00000000-0000-0000-0000-000000000000";
    await assert.rejects(
      async () => {
        await skillService.deleteSkill(user1Id, fakeSkillId);
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 404);
        return true;
      }
    );
  });

  await t.test("18. deleteSkill successfully deletes the skill and returns success result", async () => {
    const res = await skillService.deleteSkill(user1Id, skill1Id);
    assert.equal(res.success, true);
    assert.equal(res.id, skill1Id);

    // Verify subsequent get throws 404
    await assert.rejects(
      async () => {
        await skillService.getSkillById(user1Id, skill1Id);
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 404);
        return true;
      }
    );
  });

  // -------------------------------------------------------------------------
  // ZOD SCHEMA VALIDATION TESTS
  // -------------------------------------------------------------------------
  await t.test("19. createSkillSchema correctly validates valid payloads and rejects invalid formats", () => {
    // Valid minimal
    const validMinimal = createSkillSchema.parse({
      name: "Docker",
      category: "DevOps",
    });
    assert.equal(validMinimal.name, "Docker");
    assert.equal(validMinimal.category, "DevOps");

    // Valid with orderIndex
    const validFull = createSkillSchema.parse({
      name: "  Kubernetes  ",
      category: "  Cloud  ",
      orderIndex: 4,
    });
    assert.equal(validFull.name, "Kubernetes");
    assert.equal(validFull.category, "Cloud");
    assert.equal(validFull.orderIndex, 4);

    // Missing name
    assert.throws(() => {
      createSkillSchema.parse({ category: "DevOps" });
    });

    // Empty name
    assert.throws(() => {
      createSkillSchema.parse({ name: "   ", category: "DevOps" });
    });

    // Name > 100
    assert.throws(() => {
      createSkillSchema.parse({ name: "N".repeat(101), category: "DevOps" });
    });

    // Missing category
    assert.throws(() => {
      createSkillSchema.parse({ name: "Docker" });
    });

    // Category > 50
    assert.throws(() => {
      createSkillSchema.parse({ name: "Docker", category: "C".repeat(51) });
    });

    // Negative orderIndex
    assert.throws(() => {
      createSkillSchema.parse({ name: "Docker", category: "DevOps", orderIndex: -1 });
    });

    // Float orderIndex
    assert.throws(() => {
      createSkillSchema.parse({ name: "Docker", category: "DevOps", orderIndex: 1.5 });
    });
  });

  await t.test("20. updateSkillSchema correctly handles partial updates and rejects invalid fields", () => {
    // Valid partial name
    const validName = updateSkillSchema.parse({ name: "Python 3" });
    assert.equal(validName.name, "Python 3");

    // Valid partial category
    const validCat = updateSkillSchema.parse({ category: "AI & ML" });
    assert.equal(validCat.category, "AI & ML");

    // Valid partial orderIndex
    const validOrder = updateSkillSchema.parse({ orderIndex: 10 });
    assert.equal(validOrder.orderIndex, 10);

    // Empty object is valid in update
    const validEmpty = updateSkillSchema.parse({});
    assert.deepEqual(validEmpty, {});

    // Empty name rejected
    assert.throws(() => {
      updateSkillSchema.parse({ name: "   " });
    });

    // Empty category rejected
    assert.throws(() => {
      updateSkillSchema.parse({ category: "   " });
    });

    // Name > 100 rejected
    assert.throws(() => {
      updateSkillSchema.parse({ name: "X".repeat(101) });
    });

    // Category > 50 rejected
    assert.throws(() => {
      updateSkillSchema.parse({ category: "Y".repeat(51) });
    });

    // Negative orderIndex rejected
    assert.throws(() => {
      updateSkillSchema.parse({ orderIndex: -2 });
    });
  });
});

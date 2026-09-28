import test from "node:test";
import assert from "node:assert/strict";
import { pool } from "../config/database";
import { experienceService } from "./experience.service";
import { AppError } from "../utils/errors";
import type {
  CreateExperienceInput,
  UpdateExperienceInput,
} from "../types/experience.types";

test("EXP-04: Experience Backend Service Integration Suite", async (t) => {
  const uniqueTag = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const user1Email = `exp_user1_${uniqueTag}@foliocraft.test`;
  const user2Email = `exp_user2_${uniqueTag}@foliocraft.test`;

  let user1Id = "";
  let user2Id = "";
  let portfolio1Id = "";
  let portfolio2Id = "";
  const createdExperienceIds: string[] = [];

  t.before(async () => {
    // 1. Create 2 test users for ownership isolation testing
    const u1 = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["Experience Owner One", user1Email, "hashed_pw"]
    );
    user1Id = u1.rows[0]!.id;

    const u2 = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["Experience Owner Two", user2Email, "hashed_pw"]
    );
    user2Id = u2.rows[0]!.id;

    // 2. Create a portfolio for each user
    const p1 = await pool.query<{ id: string }>(
      `INSERT INTO portfolios (user_id, name, title, username)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [user1Id, "Portfolio One", "Staff Software Engineer", `exp_port1_${uniqueTag}`]
    );
    portfolio1Id = p1.rows[0]!.id;

    const p2 = await pool.query<{ id: string }>(
      `INSERT INTO portfolios (user_id, name, title, username)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [user2Id, "Portfolio Two", "DevOps Engineer", `exp_port2_${uniqueTag}`]
    );
    portfolio2Id = p2.rows[0]!.id;
  });

  t.after(async () => {
    try {
      for (const expId of createdExperienceIds) {
        await pool.query("DELETE FROM experience WHERE id = $1", [expId]);
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
      console.error("Cleanup error in experience.service.test.ts:", err);
    }
  });

  await t.test("1. createExperience successfully creates experience with all mapped camelCase fields", async () => {
    const input: CreateExperienceInput = {
      company: "Google",
      position: "Senior Software Engineer",
      description: "Working on core search indexing engines.",
      startDate: "2020-01-15",
      endDate: "2022-12-31",
      isCurrent: false,
    };

    const created = await experienceService.createExperience(
      portfolio1Id,
      user1Id,
      input
    );
    createdExperienceIds.push(created.id);

    assert.ok(created.id);
    assert.equal(created.portfolioId, portfolio1Id);
    assert.equal(created.company, "Google");
    assert.equal(created.position, "Senior Software Engineer");
    assert.equal(created.description, "Working on core search indexing engines.");
    assert.equal(created.startDate, "2020-01-15");
    assert.equal(created.endDate, "2022-12-31");
    assert.equal(created.isCurrent, false);
    assert.ok(created.createdAt instanceof Date);
    assert.ok(created.updatedAt instanceof Date);
  });

  await t.test("2. createExperience with isCurrent=true normalizes and clears endDate to null", async () => {
    const input: CreateExperienceInput = {
      company: "Stripe",
      position: "Staff Architect",
      description: "Leading global payments infrastructure.",
      startDate: "2023-01-01",
      endDate: "2025-12-31", // Even if client provided an endDate
      isCurrent: true,
    };

    const created = await experienceService.createExperience(
      portfolio1Id,
      user1Id,
      input
    );
    createdExperienceIds.push(created.id);

    assert.equal(created.company, "Stripe");
    assert.equal(created.isCurrent, true);
    assert.equal(
      created.endDate,
      null,
      "endDate must be normalized to null when isCurrent is true"
    );
  });

  await t.test("3. createExperience rejects invalid input, non-existent portfolio (404), and invalid user", async () => {
    // Non-existent portfolio
    const nonExistentPortId = "11111111-1111-1111-1111-111111111111";
    await assert.rejects(
      async () => {
        await experienceService.createExperience(nonExistentPortId, user1Id, {
          company: "Meta",
          position: "Engineer",
          startDate: "2021-01-01",
        });
      },
      (err: unknown) => err instanceof AppError && err.statusCode === 404
    );

    // Validation failure (empty company)
    await assert.rejects(
      async () => {
        await experienceService.createExperience(portfolio1Id, user1Id, {
          company: "",
          position: "Engineer",
          startDate: "2021-01-01",
        });
      },
      (err: unknown) => err instanceof AppError && err.statusCode === 400
    );
  });

  await t.test("4. createExperience ownership check: user cannot create experience in another user's portfolio (403)", async () => {
    await assert.rejects(
      async () => {
        await experienceService.createExperience(portfolio1Id, user2Id, {
          company: "Hacker Corp",
          position: "Infiltrator",
          startDate: "2022-01-01",
        });
      },
      (err: unknown) => err instanceof AppError && err.statusCode === 403
    );
  });

  await t.test("5. getExperiencesByPortfolio returns records ordered by is_current DESC, start_date DESC, created_at DESC", async () => {
    // Create an older past role
    const older = await experienceService.createExperience(portfolio1Id, user1Id, {
      company: "Early Startup",
      position: "Junior Developer",
      startDate: "2018-06-01",
      endDate: "2019-12-31",
      isCurrent: false,
    });
    createdExperienceIds.push(older.id);

    const list = await experienceService.getExperiencesByPortfolio(
      portfolio1Id,
      user1Id
    );

    assert.ok(list.length >= 3);
    // Active roles (isCurrent = true) must appear first
    assert.equal(list[0]!.isCurrent, true);
    assert.equal(list[0]!.company, "Stripe");

    // Past roles must be ordered by startDate DESC
    const pastRoles = list.filter((r) => !r.isCurrent);
    for (let i = 0; i < pastRoles.length - 1; i++) {
      assert.ok(
        pastRoles[i]!.startDate >= pastRoles[i + 1]!.startDate,
        `Expected ${pastRoles[i]!.startDate} >= ${pastRoles[i + 1]!.startDate}`
      );
    }
  });

  await t.test("6. getExperiencesByPortfolio throws 404 for non-existent portfolio and 403 for unauthorized user", async () => {
    // 404 for non-existent
    await assert.rejects(
      async () => {
        await experienceService.getExperiencesByPortfolio(
          "22222222-2222-2222-2222-222222222222",
          user1Id
        );
      },
      (err: unknown) => err instanceof AppError && err.statusCode === 404
    );

    // 403 for another user
    await assert.rejects(
      async () => {
        await experienceService.getExperiencesByPortfolio(portfolio1Id, user2Id);
      },
      (err: unknown) => err instanceof AppError && err.statusCode === 403
    );
  });

  await t.test("7. getExperienceById retrieves single record for owner", async () => {
    const expId = createdExperienceIds[0]!;
    const fetched = await experienceService.getExperienceById(expId, user1Id);

    assert.equal(fetched.id, expId);
    assert.equal(fetched.company, "Google");
    assert.equal(fetched.position, "Senior Software Engineer");
  });

  await t.test("8. getExperienceById throws 404 for missing record and 403 for unauthorized user", async () => {
    // Missing record (404)
    await assert.rejects(
      async () => {
        await experienceService.getExperienceById(
          "33333333-3333-3333-3333-333333333333",
          user1Id
        );
      },
      (err: unknown) => err instanceof AppError && err.statusCode === 404
    );

    // Unauthorized user accessing user1's record (403)
    const expId = createdExperienceIds[0]!;
    await assert.rejects(
      async () => {
        await experienceService.getExperienceById(expId, user2Id);
      },
      (err: unknown) => err instanceof AppError && err.statusCode === 403
    );
  });

  await t.test("9. updateExperience successfully partially updates fields", async () => {
    const expId = createdExperienceIds[0]!;
    const updateInput: UpdateExperienceInput = {
      position: "Staff Software Engineer, Search",
      description: "Promoted to lead search indexing architecture.",
    };

    const updated = await experienceService.updateExperience(
      expId,
      user1Id,
      updateInput
    );

    assert.equal(updated.id, expId);
    assert.equal(updated.position, "Staff Software Engineer, Search");
    assert.equal(
      updated.description,
      "Promoted to lead search indexing architecture."
    );
    // Unchanged fields preserved
    assert.equal(updated.company, "Google");
    assert.equal(updated.startDate, "2020-01-15");
    assert.equal(updated.endDate, "2022-12-31");
    assert.equal(updated.isCurrent, false);
  });

  await t.test(
    "10. updateExperience validating final combined state when updating only startDate",
    async () => {
      // Create a fixed record: startDate = 2021-01-01, endDate = 2022-01-01
      const rec = await experienceService.createExperience(portfolio1Id, user1Id, {
        company: "Date Check Co",
        position: "Engineer",
        startDate: "2021-01-01",
        endDate: "2022-01-01",
        isCurrent: false,
      });
      createdExperienceIds.push(rec.id);

      // A: Update only startDate to 2021-06-01 (valid: <= 2022-01-01)
      const validUpdate = await experienceService.updateExperience(rec.id, user1Id, {
        startDate: "2021-06-01",
      });
      assert.equal(validUpdate.startDate, "2021-06-01");
      assert.equal(validUpdate.endDate, "2022-01-01");

      // B: Update only startDate to 2023-01-01 (invalid: > existing endDate 2022-01-01)
      await assert.rejects(
        async () => {
          await experienceService.updateExperience(rec.id, user1Id, {
            startDate: "2023-01-01",
          });
        },
        (err: unknown) =>
          err instanceof AppError &&
          err.statusCode === 400 &&
          err.message === "End date must be on or after start date"
      );
    }
  );

  await t.test(
    "11. updateExperience validating final combined state when updating only endDate",
    async () => {
      // Existing record has startDate = 2021-06-01
      const recId = createdExperienceIds[createdExperienceIds.length - 1]!;

      // A: Update only endDate to 2022-06-01 (valid: >= existing startDate 2021-06-01)
      const validUpdate = await experienceService.updateExperience(recId, user1Id, {
        endDate: "2022-06-01",
      });
      assert.equal(validUpdate.endDate, "2022-06-01");
      assert.equal(validUpdate.startDate, "2021-06-01");

      // B: Update only endDate to 2020-01-01 (invalid: < existing startDate 2021-06-01)
      await assert.rejects(
        async () => {
          await experienceService.updateExperience(recId, user1Id, {
            endDate: "2020-01-01",
          });
        },
        (err: unknown) =>
          err instanceof AppError &&
          err.statusCode === 400 &&
          err.message === "End date must be on or after start date"
      );
    }
  );

  await t.test("12. updateExperience with isCurrent=true normalizes and clears existing endDate", async () => {
    // Record currently has endDate = 2022-06-01 and isCurrent = false
    const recId = createdExperienceIds[createdExperienceIds.length - 1]!;

    const updated = await experienceService.updateExperience(recId, user1Id, {
      isCurrent: true,
    });

    assert.equal(updated.isCurrent, true);
    assert.equal(
      updated.endDate,
      null,
      "endDate must be cleared to null when isCurrent is transitioned to true"
    );
  });

  await t.test("13. updateExperience ownership check: user cannot update another user's record (403)", async () => {
    const recId = createdExperienceIds[0]!;
    await assert.rejects(
      async () => {
        await experienceService.updateExperience(recId, user2Id, {
          company: "Compromised Co",
        });
      },
      (err: unknown) => err instanceof AppError && err.statusCode === 403
    );
  });

  await t.test("14. updateExperience rejects empty body with no fields (400)", async () => {
    const recId = createdExperienceIds[0]!;
    await assert.rejects(
      async () => {
        await experienceService.updateExperience(recId, user1Id, {});
      },
      (err: unknown) => err instanceof AppError && err.statusCode === 400
    );
  });

  await t.test("15. deleteExperience successfully removes record and subsequent get throws 404", async () => {
    // Create dedicated experience to delete
    const toDelete = await experienceService.createExperience(portfolio1Id, user1Id, {
      company: "Temp Contract",
      position: "Consultant",
      startDate: "2021-01-01",
      endDate: "2021-03-31",
      isCurrent: false,
    });

    const result = await experienceService.deleteExperience(toDelete.id, user1Id);
    assert.deepEqual(result, { success: true, id: toDelete.id });

    // Subsequent retrieval fails with 404
    await assert.rejects(
      async () => {
        await experienceService.getExperienceById(toDelete.id, user1Id);
      },
      (err: unknown) => err instanceof AppError && err.statusCode === 404
    );
  });

  await t.test("16. deleteExperience throws 404 for missing record and 403 for unauthorized user", async () => {
    // 404
    await assert.rejects(
      async () => {
        await experienceService.deleteExperience(
          "44444444-4444-4444-4444-444444444444",
          user1Id
        );
      },
      (err: unknown) => err instanceof AppError && err.statusCode === 404
    );

    // 403
    const recId = createdExperienceIds[0]!;
    await assert.rejects(
      async () => {
        await experienceService.deleteExperience(recId, user2Id);
      },
      (err: unknown) => err instanceof AppError && err.statusCode === 403
    );
  });
});

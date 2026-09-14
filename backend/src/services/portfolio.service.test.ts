import test from "node:test";
import assert from "node:assert/strict";
import { pool } from "../config/database";
import { portfolioService } from "./portfolio.service";
import { AppError } from "../utils/errors";

test("PORTFOLIO-02: Portfolio Backend Service Integration Suite", async (t) => {
  const uniqueTag = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const user1Email = `port_user1_${uniqueTag}@foliocraft.test`;
  const user2Email = `port_user2_${uniqueTag}@foliocraft.test`;

  let user1Id = "";
  let user2Id = "";
  const createdPortfolioIds: string[] = [];

  // Setup: Create 2 test users to test ownership and multi-user isolation
  t.before(async () => {
    const u1 = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["User One", user1Email, "hashed_dummy_pw"]
    );
    user1Id = u1.rows[0]!.id;

    const u2 = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      ["User Two", user2Email, "hashed_dummy_pw"]
    );
    user2Id = u2.rows[0]!.id;
  });

  // Teardown: Clean up all portfolios and test users
  t.after(async () => {
    try {
      for (const pId of createdPortfolioIds) {
        await pool.query("DELETE FROM portfolios WHERE id = $1", [pId]);
      }
      if (user1Id) {
        await pool.query("DELETE FROM users WHERE id = $1", [user1Id]);
      }
      if (user2Id) {
        await pool.query("DELETE FROM users WHERE id = $1", [user2Id]);
      }
    } catch (err) {
      console.error("Cleanup error in portfolio.service.test.ts:", err);
    }
  });

  let portfolio1Id = "";

  await t.test("1 & 2 & 3 & 4. createPortfolio successfully creates portfolio belonging to user with all fields & JSONB", async () => {
    const socialLinks = {
      github: "https://github.com/userone",
      linkedin: "https://linkedin.com/in/userone",
      twitter: "https://twitter.com/userone",
    };

    const portfolio = await portfolioService.createPortfolio(user1Id, {
      name: "Alex Developer",
      title: "Staff Software Engineer",
      username: `alex_${uniqueTag}`,
      email: "alex.contact@example.com",
      phone: "+1 (555) 987-6543",
      location: "Seattle, WA",
      about: "Architecting cloud-native distributed systems with TypeScript and Go.",
      profileImageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb",
      socialLinks,
      template: "minimal",
      published: true,
    });

    assert.ok(portfolio.id);
    portfolio1Id = portfolio.id;
    createdPortfolioIds.push(portfolio.id);

    // Verify ownership
    assert.equal(portfolio.userId, user1Id);

    // Verify all basic information fields
    assert.equal(portfolio.name, "Alex Developer");
    assert.equal(portfolio.title, "Staff Software Engineer");
    assert.equal(portfolio.username, `alex_${uniqueTag}`);
    assert.equal(portfolio.email, "alex.contact@example.com");
    assert.equal(portfolio.phone, "+1 (555) 987-6543");
    assert.equal(portfolio.location, "Seattle, WA");
    assert.equal(portfolio.about, "Architecting cloud-native distributed systems with TypeScript and Go.");
    assert.equal(portfolio.profileImageUrl, "https://images.unsplash.com/photo-1534528741775-53994a69daeb");
    assert.deepEqual(portfolio.socialLinks, socialLinks);
    assert.equal(portfolio.template, "minimal");
    assert.equal(portfolio.published, true);
    assert.ok(portfolio.createdAt instanceof Date);
    assert.ok(portfolio.updatedAt instanceof Date);
  });

  await t.test("5 & 6. createPortfolio handles default template ('modern') and default published (false)", async () => {
    const defaultPortfolio = await portfolioService.createPortfolio(user1Id, {
      name: "Alex Minimal",
      title: "Frontend Developer",
      username: `alex_min_${uniqueTag}`,
    });

    assert.ok(defaultPortfolio.id);
    createdPortfolioIds.push(defaultPortfolio.id);

    assert.equal(defaultPortfolio.template, "modern");
    assert.equal(defaultPortfolio.published, false);
    assert.equal(defaultPortfolio.email, null);
    assert.equal(defaultPortfolio.phone, null);
    assert.equal(defaultPortfolio.location, null);
    assert.equal(defaultPortfolio.about, null);
    assert.equal(defaultPortfolio.profileImageUrl, null);
    assert.deepEqual(defaultPortfolio.socialLinks, {});
  });

  await t.test("7. duplicate username is rejected with 409 Conflict AppError", async () => {
    await assert.rejects(
      async () => {
        await portfolioService.createPortfolio(user2Id, {
          name: "Imposter User",
          title: "Copycat",
          username: `alex_${uniqueTag}`, // Existing username
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 409);
        assert.equal(err.message, "Username is already taken");
        return true;
      }
    );
  });

  await t.test("Validation: rejects missing required fields and invalid userId", async () => {
    // Missing name
    await assert.rejects(
      async () => {
        await portfolioService.createPortfolio(user1Id, {
          name: "   ",
          title: "Dev",
          username: `valid_user_${uniqueTag}`,
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 400);
        assert.equal(err.message, "Name is required");
        return true;
      }
    );

    // Missing title
    await assert.rejects(
      async () => {
        await portfolioService.createPortfolio(user1Id, {
          name: "Alex",
          title: "",
          username: `valid_user_${uniqueTag}`,
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 400);
        assert.equal(err.message, "Title is required");
        return true;
      }
    );

    // Missing username
    await assert.rejects(
      async () => {
        await portfolioService.createPortfolio(user1Id, {
          name: "Alex",
          title: "Dev",
          username: "  ",
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 400);
        assert.equal(err.message, "Username is required");
        return true;
      }
    );

    // Invalid userId format
    await assert.rejects(
      async () => {
        await portfolioService.createPortfolio("not-a-uuid", {
          name: "Alex",
          title: "Dev",
          username: `valid_user_${uniqueTag}`,
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 400);
        assert.equal(err.message, "Invalid user ID");
        return true;
      }
    );
  });

  await t.test("8. getPortfoliosByUserId returns only portfolios owned by that user", async () => {
    // Create a portfolio for User 2
    const u2Portfolio = await portfolioService.createPortfolio(user2Id, {
      name: "User Two Portfolio",
      title: "Backend Engineer",
      username: `user2_${uniqueTag}`,
    });
    createdPortfolioIds.push(u2Portfolio.id);

    // Fetch user 1 portfolios
    const u1Portfolios = await portfolioService.getPortfoliosByUserId(user1Id);
    assert.equal(u1Portfolios.length, 2);
    for (const p of u1Portfolios) {
      assert.equal(p.userId, user1Id);
    }

    // Fetch user 2 portfolios
    const u2Portfolios = await portfolioService.getPortfoliosByUserId(user2Id);
    assert.equal(u2Portfolios.length, 1);
    assert.equal(u2Portfolios[0]!.userId, user2Id);
    assert.equal(u2Portfolios[0]!.id, u2Portfolio.id);
  });

  await t.test("9. getPortfolioById returns the correct portfolio", async () => {
    const portfolio = await portfolioService.getPortfolioById(portfolio1Id);
    assert.equal(portfolio.id, portfolio1Id);
    assert.equal(portfolio.name, "Alex Developer");
    assert.equal(portfolio.userId, user1Id);
  });

  await t.test("10. another user's portfolio cannot be accessed through ownership-aware service operation", async () => {
    // User 1 accessing User 1's portfolio succeeds
    const ownAccess = await portfolioService.getPortfolioById(portfolio1Id, user1Id);
    assert.equal(ownAccess.id, portfolio1Id);

    // User 2 accessing User 1's portfolio throws 403
    await assert.rejects(
      async () => {
        await portfolioService.getPortfolioById(portfolio1Id, user2Id);
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 403);
        assert.equal(err.message, "Unauthorized access to portfolio");
        return true;
      }
    );
  });

  await t.test("11 & 12. updatePortfolio updates supplied fields and preserves unspecified fields", async () => {
    const updated = await portfolioService.updatePortfolio(portfolio1Id, user1Id, {
      title: "Principal Engineer",
      about: "Updated bio about systems and leadership.",
      socialLinks: { github: "https://github.com/userone-new" },
    });

    // Updated fields changed
    assert.equal(updated.title, "Principal Engineer");
    assert.equal(updated.about, "Updated bio about systems and leadership.");
    assert.deepEqual(updated.socialLinks, { github: "https://github.com/userone-new" });

    // Unspecified fields preserved
    assert.equal(updated.name, "Alex Developer");
    assert.equal(updated.username, `alex_${uniqueTag}`);
    assert.equal(updated.email, "alex.contact@example.com");
    assert.equal(updated.phone, "+1 (555) 987-6543");
    assert.equal(updated.location, "Seattle, WA");
    assert.equal(updated.template, "minimal");
    assert.equal(updated.published, true);
  });

  await t.test("13. username update respects uniqueness (rejects collision with 409)", async () => {
    // User 1 tries to update portfolio username to User 2's username
    await assert.rejects(
      async () => {
        await portfolioService.updatePortfolio(portfolio1Id, user1Id, {
          username: `user2_${uniqueTag}`,
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 409);
        assert.equal(err.message, "Username is already taken");
        return true;
      }
    );

    // Updating to its own current username succeeds
    const selfUpdate = await portfolioService.updatePortfolio(portfolio1Id, user1Id, {
      username: `alex_${uniqueTag}`,
    });
    assert.equal(selfUpdate.username, `alex_${uniqueTag}`);
  });

  await t.test("Ownership on update: another user cannot update portfolio", async () => {
    await assert.rejects(
      async () => {
        await portfolioService.updatePortfolio(portfolio1Id, user2Id, {
          name: "Hacked Name",
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

  await t.test("15. another user cannot delete the portfolio", async () => {
    await assert.rejects(
      async () => {
        await portfolioService.deletePortfolio(portfolio1Id, user2Id);
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 403);
        assert.equal(err.message, "Unauthorized to delete this portfolio");
        return true;
      }
    );

    // Confirm it still exists
    const check = await portfolioService.getPortfolioById(portfolio1Id);
    assert.equal(check.id, portfolio1Id);
  });

  await t.test("14. deletePortfolio deletes the correct portfolio", async () => {
    const result = await portfolioService.deletePortfolio(portfolio1Id, user1Id);
    assert.equal(result.success, true);
    assert.equal(result.id, portfolio1Id);

    // Verify it is gone
    await assert.rejects(
      async () => {
        await portfolioService.getPortfolioById(portfolio1Id);
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.statusCode, 404);
        assert.equal(err.message, "Portfolio not found");
        return true;
      }
    );
  });
});

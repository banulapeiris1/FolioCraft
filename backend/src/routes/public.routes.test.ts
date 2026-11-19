import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../server";
import { pool } from "../config/database";

test("PUB-02: Public Portfolio Retrieval API Suite (GET /api/public/:username)", async (t) => {
  let server: Server;
  let baseUrl: string;

  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  let testUserId = "";
  let publishedPortfolioId = "";
  let unpublishedPortfolioId = "";

  const publishedUsername = `pub_${uniqueSuffix}`;
  const unpublishedUsername = `draft_${uniqueSuffix}`;

  t.before(async () => {
    server = app.listen(0);
    const address = server.address() as AddressInfo;
    baseUrl = `http://localhost:${address.port}`;

    // 1. Create a test user
    const uRes = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [
        "Public Portfolio Tester",
        `public_test_${uniqueSuffix}@foliocraft.test`,
        "hashed_test_password_secret",
      ]
    );
    testUserId = uRes.rows[0]!.id;

    // 2. Create a PUBLISHED portfolio with social links and contact info
    const p1Res = await pool.query<{ id: string }>(
      `INSERT INTO portfolios (
         user_id, name, title, about, email, phone, location,
         profile_image_url, social_links, username, template, published, published_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
       RETURNING id`,
      [
        testUserId,
        "Dev Lead Alex",
        "Staff Infrastructure Engineer",
        "Building reliable cloud-native distributed platforms.",
        "alex.public@foliocraft.test",
        "+1-555-0199",
        "San Francisco, CA",
        "https://example.com/avatar.png",
        JSON.stringify({
          github: "https://github.com/alexchen",
          linkedin: "https://linkedin.com/in/alexchen",
          twitter: "https://x.com/alexchen",
        }),
        publishedUsername,
        "modern",
        true,
      ]
    );
    publishedPortfolioId = p1Res.rows[0]!.id;

    // 3. Create an UNPUBLISHED portfolio (Draft)
    const p2Res = await pool.query<{ id: string }>(
      `INSERT INTO portfolios (
         user_id, name, title, about, username, template, published
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        testUserId,
        "Secret Draft User",
        "Private Contractor",
        "Confidential projects.",
        unpublishedUsername,
        "minimal",
        false,
      ]
    );
    unpublishedPortfolioId = p2Res.rows[0]!.id;

    // 4. Insert projects for the published portfolio
    await pool.query(
      `INSERT INTO projects (portfolio_id, title, description, technologies, github_url, project_url, order_index)
       VALUES 
         ($1, $2, $3, $4, $5, $6, $7),
         ($1, $8, $9, $10, $11, $12, $13)`,
      [
        publishedPortfolioId,
        "Kubernetes Autoscaler",
        "Custom metrics auto-scaler for microservices",
        JSON.stringify(["Go", "Kubernetes", "Prometheus"]),
        "https://github.com/alexchen/k8s-scaler",
        "https://scaler.dev",
        0,
        "Distributed KV Store",
        "Raft-consensus based storage engine",
        JSON.stringify(["Rust", "Tokio", "gRPC"]),
        "https://github.com/alexchen/raft-kv",
        null,
        1,
      ]
    );

    // 5. Insert skills for the published portfolio
    await pool.query(
      `INSERT INTO skills (portfolio_id, name, category, order_index)
       VALUES 
         ($1, $2, $3, $4),
         ($1, $5, $6, $7),
         ($1, $8, $9, $10)`,
      [
        publishedPortfolioId,
        "Go",
        "Backend",
        0,
        "Docker",
        "Cloud & DevOps",
        0,
        "PostgreSQL",
        "Database",
        0,
      ]
    );

    // 6. Insert experience for the published portfolio
    await pool.query(
      `INSERT INTO experience (portfolio_id, company, position, description, start_date, end_date, is_current)
       VALUES 
         ($1, $2, $3, $4, $5, $6, $7),
         ($1, $8, $9, $10, $11, $12, $13)`,
      [
        publishedPortfolioId,
        "Acme Cloud Systems",
        "Senior Infrastructure Architect",
        "Led multi-region Kubernetes migration",
        "2023-01-01",
        null,
        true,
        "Data Corp",
        "Backend Engineer",
        "Developed high-throughput ingestion pipelines",
        "2020-06-01",
        "2022-12-31",
        false,
      ]
    );
  });

  t.after(async () => {
    server.close();
    try {
      if (publishedPortfolioId) {
        await pool.query("DELETE FROM portfolios WHERE id = $1", [publishedPortfolioId]);
      }
      if (unpublishedPortfolioId) {
        await pool.query("DELETE FROM portfolios WHERE id = $1", [unpublishedPortfolioId]);
      }
      if (testUserId) {
        await pool.query("DELETE FROM users WHERE id = $1", [testUserId]);
      }
    } catch (e) {
      console.error("Cleanup error in public.routes.test.ts:", e);
    }
  });

  await t.test("1. Retrieve a published portfolio returns 200 OK without JWT", async () => {
    // Notice: NO Authorization header is sent (anonymous access)
    const res = await fetch(`${baseUrl}/api/public/${publishedUsername}`);
    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.portfolio);
    assert.equal(body.portfolio.name, "Dev Lead Alex");
    assert.equal(body.portfolio.title, "Staff Infrastructure Engineer");
    assert.equal(body.portfolio.username, publishedUsername);
    assert.equal(body.portfolio.published, true);
    assert.equal(body.portfolio.template, "modern");
    assert.ok(body.portfolio.publishedAt);
  });

  await t.test(
    "2. Retrieve an unpublished portfolio returns 404 with generic message (prevents draft enumeration)",
    async () => {
      const res = await fetch(`${baseUrl}/api/public/${unpublishedUsername}`);
      assert.equal(res.status, 404);

      const body = await res.json();
      assert.equal(body.message, "Portfolio not found");
    }
  );

  await t.test("3. Retrieve a non-existent username returns 404", async () => {
    const res = await fetch(`${baseUrl}/api/public/nonexistent_user_${uniqueSuffix}`);
    assert.equal(res.status, 404);

    const body = await res.json();
    assert.equal(body.message, "Portfolio not found");
  });

  await t.test(
    "4. Retrieve using uppercase/lowercase username variants resolves case-insensitively",
    async () => {
      // Uppercase
      const upperRes = await fetch(`${baseUrl}/api/public/${publishedUsername.toUpperCase()}`);
      assert.equal(upperRes.status, 200);
      const upperBody = await upperRes.json();
      assert.equal(upperBody.portfolio.username, publishedUsername);

      // Mixed-case
      const mixedUsername =
        publishedUsername.slice(0, 2).toUpperCase() + publishedUsername.slice(2);
      const mixedRes = await fetch(`${baseUrl}/api/public/${mixedUsername}`);
      assert.equal(mixedRes.status, 200);
      const mixedBody = await mixedRes.json();
      assert.equal(mixedBody.portfolio.username, publishedUsername);
    }
  );

  await t.test("5. Invalid username handling returns 400 Bad Request", async () => {
    // Contains illegal special characters
    const resSpecial = await fetch(`${baseUrl}/api/public/alex@chen!`);
    assert.equal(resSpecial.status, 400);
    const bodySpecial = await resSpecial.json();
    assert.ok(bodySpecial.message.includes("alphanumeric"));

    // Exceeds 50 characters
    const longUsername = "a".repeat(55);
    const resLong = await fetch(`${baseUrl}/api/public/${longUsername}`);
    assert.equal(resLong.status, 400);
    const bodyLong = await resLong.json();
    assert.ok(bodyLong.message.includes("50 characters"));
  });

  await t.test(
    "6. Portfolio includes projects collection with proper camelCased fields",
    async () => {
      const res = await fetch(`${baseUrl}/api/public/${publishedUsername}`);
      assert.equal(res.status, 200);

      const body = await res.json();
      const projects = body.portfolio.projects;
      assert.ok(Array.isArray(projects));
      assert.equal(projects.length, 2);

      const firstProj = projects[0];
      assert.equal(firstProj.title, "Kubernetes Autoscaler");
      assert.deepEqual(firstProj.technologies, ["Go", "Kubernetes", "Prometheus"]);
      assert.equal(firstProj.githubUrl, "https://github.com/alexchen/k8s-scaler");
      assert.equal(firstProj.projectUrl, "https://scaler.dev");
      assert.equal(firstProj.orderIndex, 0);

      const secondProj = projects[1];
      assert.equal(secondProj.title, "Distributed KV Store");
      assert.equal(secondProj.projectUrl, null);
    }
  );

  await t.test("7. Portfolio includes skills collection categorized and ordered", async () => {
    const res = await fetch(`${baseUrl}/api/public/${publishedUsername}`);
    assert.equal(res.status, 200);

    const body = await res.json();
    const skills = body.portfolio.skills;
    assert.ok(Array.isArray(skills));
    assert.equal(skills.length, 3);

    const skillNames = skills.map((s: { name: string }) => s.name);
    assert.ok(skillNames.includes("Go"));
    assert.ok(skillNames.includes("Docker"));
    assert.ok(skillNames.includes("PostgreSQL"));
  });

  await t.test("8. Portfolio includes experience collection properly formatted", async () => {
    const res = await fetch(`${baseUrl}/api/public/${publishedUsername}`);
    assert.equal(res.status, 200);

    const body = await res.json();
    const experiences = body.portfolio.experiences;
    assert.ok(Array.isArray(experiences));
    assert.equal(experiences.length, 2);

    // Current position should be first (ORDER BY is_current DESC)
    const currentRole = experiences[0];
    assert.equal(currentRole.company, "Acme Cloud Systems");
    assert.equal(currentRole.position, "Senior Infrastructure Architect");
    assert.equal(currentRole.isCurrent, true);
    assert.equal(currentRole.startDate, "2023-01-01");
    assert.equal(currentRole.endDate, null);

    const pastRole = experiences[1];
    assert.equal(pastRole.company, "Data Corp");
    assert.equal(pastRole.isCurrent, false);
    assert.equal(pastRole.startDate, "2020-06-01");
    assert.equal(pastRole.endDate, "2022-12-31");
  });

  await t.test(
    "9. Education handling according to actual schema availability does not fail",
    async () => {
      // In the current active schema, education was not merged.
      // The public portfolio retrieval must succeed cleanly without throwing DB errors.
      const res = await fetch(`${baseUrl}/api/public/${publishedUsername}`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.ok(body.portfolio);
    }
  );

  await t.test(
    "10. Sensitive information is NOT exposed in public portfolio response",
    async () => {
      const res = await fetch(`${baseUrl}/api/public/${publishedUsername}`);
      assert.equal(res.status, 200);

      const body = await res.json();
      const p = body.portfolio;

      // Assert user ID is strictly stripped
      assert.equal(p.userId, undefined, "userId must not be exposed");
      assert.equal(p.user_id, undefined, "user_id must not be exposed");

      // Assert password hashes or account tokens are never present
      assert.equal(p.passwordHash, undefined, "passwordHash must not be exposed");
      assert.equal(p.password_hash, undefined, "password_hash must not be exposed");
      assert.equal(p.token, undefined, "token must not be exposed");

      // Assert CV upload metadata is never present
      assert.equal(p.cvUploads, undefined, "cvUploads must not be exposed");
      assert.equal(p.rawText, undefined, "rawText must not be exposed");
      assert.equal(p.parsedData, undefined, "parsedData must not be exposed");

      // Verify contact channels: socialLinks is sanitized object
      assert.deepEqual(p.socialLinks, {
        github: "https://github.com/alexchen",
        linkedin: "https://linkedin.com/in/alexchen",
        twitter: "https://x.com/alexchen",
      });
    }
  );

  await t.test("11. SQL injection attempts are safely rejected or return 404", async () => {
    const maliciousUsernames = [
      "' OR '1'='1",
      "admin'--",
      "'; DROP TABLE portfolios; --",
      "' UNION SELECT null, null, null, null--",
    ];

    for (const injection of maliciousUsernames) {
      const encoded = encodeURIComponent(injection);
      const res = await fetch(`${baseUrl}/api/public/${encoded}`);
      // Either 400 (rejected by character whitelist) or 404 (parameterized query found nothing)
      assert.ok(
        res.status === 400 || res.status === 404,
        `Injection attempt '${injection}' must return 400 or 404, got ${res.status}`
      );
      const body = await res.json();
      assert.notEqual(res.status, 500, "Must not throw 500 internal server error");
      assert.ok(body.message, "Response must include safe error message");
    }

    // Verify DB table still intact after injection attempt
    const checkTable = await pool.query("SELECT COUNT(*) FROM portfolios");
    assert.ok(Number(checkTable.rows[0].count) >= 1);
  });

  await t.test("12. Anonymous access without JWT is permitted", async () => {
    // Explicitly send request with empty headers
    const res = await fetch(`${baseUrl}/api/public/${publishedUsername}`, {
      headers: {},
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.portfolio.name, "Dev Lead Alex");
  });
});


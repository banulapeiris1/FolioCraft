import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../server";
import { pool } from "../config/database";
import { signToken } from "../utils/auth";

/**
 * PUB-06D regression suite.
 *
 * D6 – Publishing state (published / published_at) can only be changed through
 *      POST /api/portfolios/:id/publish and /unpublish. Generic create/update
 *      must reject protected fields.
 * D5 – One shared username validator (validateUsername) governs create, update,
 *      availability checking and publishing.
 */
test("PUB-06D: Publishing Integrity (D6) & Unified Username Validation (D5) Suite", async (t) => {
  let server: Server;
  let baseUrl: string;

  const tag = `${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`;
  let ownerId = "";
  let otherId = "";
  let ownerJwt = "";
  let otherJwt = "";
  let portfolioId = "";
  let otherPortfolioId = "";
  const createdPortfolioIds: string[] = [];

  const ownerUsername = `d6owner_${tag}`;
  const otherUsername = `d6other_${tag}`;

  const json = (token: string) => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  });

  const createPortfolio = (token: string, body: Record<string, unknown>) =>
    fetch(`${baseUrl}/api/portfolios`, {
      method: "POST",
      headers: json(token),
      body: JSON.stringify(body),
    });

  const updatePortfolio = (token: string, id: string, body: Record<string, unknown>) =>
    fetch(`${baseUrl}/api/portfolios/${id}`, {
      method: "PUT",
      headers: json(token),
      body: JSON.stringify(body),
    });

  const checkUsername = (token: string, username: string, portfolio?: string) =>
    fetch(
      `${baseUrl}/api/portfolios/check-username/${encodeURIComponent(username)}${
        portfolio ? `?portfolioId=${portfolio}` : ""
      }`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

  const publish = (token: string, id: string) =>
    fetch(`${baseUrl}/api/portfolios/${id}/publish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

  const unpublish = (token: string, id: string) =>
    fetch(`${baseUrl}/api/portfolios/${id}/unpublish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

  const publicStatus = async (username: string) =>
    (await fetch(`${baseUrl}/api/public/${encodeURIComponent(username)}`)).status;

  const dbState = async (id: string) =>
    (
      await pool.query<{
        published: boolean;
        published_at: Date | null;
        username: string;
        title: string;
      }>(`SELECT published, published_at, username, title FROM portfolios WHERE id = $1`, [id])
    ).rows[0];

  /** Inserts a row directly (simulates legacy data that predates D5 validation). */
  const insertLegacyPortfolio = async (username: string, template = "modern") => {
    const res = await pool.query<{ id: string }>(
      `INSERT INTO portfolios (user_id, name, title, username, template, published)
       VALUES ($1, $2, $3, $4, $5, false)
       RETURNING id`,
      [ownerId, "Legacy Owner", "Engineer", username, template]
    );
    createdPortfolioIds.push(res.rows[0].id);
    return res.rows[0].id;
  };

  t.before(async () => {
    server = app.listen(0);
    baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`;

    const u1 = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id`,
      ["D6 Owner", `pub06d_owner_${tag}@foliocraft.test`, "hashed_pw"]
    );
    ownerId = u1.rows[0].id;
    ownerJwt = signToken({ userId: ownerId });

    const u2 = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id`,
      ["D6 Other", `pub06d_other_${tag}@foliocraft.test`, "hashed_pw"]
    );
    otherId = u2.rows[0].id;
    otherJwt = signToken({ userId: otherId });

    const ownerRes = await createPortfolio(ownerJwt, {
      name: "Owner Dev",
      title: "Platform Engineer",
      username: ownerUsername,
      template: "modern",
    });
    assert.equal(ownerRes.status, 201);
    portfolioId = ((await ownerRes.json()) as { portfolio: { id: string } }).portfolio.id;
    createdPortfolioIds.push(portfolioId);

    const otherRes = await createPortfolio(otherJwt, {
      name: "Other Dev",
      title: "Designer",
      username: otherUsername,
    });
    assert.equal(otherRes.status, 201);
    otherPortfolioId = ((await otherRes.json()) as { portfolio: { id: string } }).portfolio.id;
    createdPortfolioIds.push(otherPortfolioId);
  });

  t.after(async () => {
    server.close();
    try {
      await pool.query(`DELETE FROM portfolios WHERE id = ANY($1::uuid[])`, [createdPortfolioIds]);
      await pool.query(`DELETE FROM portfolios WHERE user_id = ANY($1::uuid[])`, [
        [ownerId, otherId].filter(Boolean),
      ]);
      await pool.query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [
        [ownerId, otherId].filter(Boolean),
      ]);
    } catch (e) {
      console.error("Cleanup error in publishingIntegrity.routes.test.ts:", e);
    }
  });

  // ===========================================================
  // D6 – Publishing bypass closed
  // ===========================================================

  await t.test("D6-1. PUT { published: true } is rejected (400) and the portfolio stays private", async () => {
    const res = await updatePortfolio(ownerJwt, portfolioId, { published: true });
    assert.equal(res.status, 400);
    const body = (await res.json()) as { message: string };
    assert.match(body.message, /published/);
    assert.match(body.message, /\/publish/);

    const state = await dbState(portfolioId);
    assert.equal(state.published, false);
    assert.equal(state.published_at, null);
    assert.equal(await publicStatus(ownerUsername), 404);
  });

  await t.test("D6-2. PUT combining protected and ordinary fields is rejected without partial update", async () => {
    const res = await updatePortfolio(ownerJwt, portfolioId, {
      title: "Should Not Persist",
      published: true,
    });
    assert.equal(res.status, 400);
    const state = await dbState(portfolioId);
    assert.equal(state.title, "Platform Engineer");
    assert.equal(state.published, false);
  });

  await t.test("D6-3. POST /api/portfolios with published: true is rejected and nothing is created", async () => {
    const username = `d6create_${tag}`;
    const res = await createPortfolio(ownerJwt, {
      name: "Sneaky",
      title: "Publisher",
      username,
      published: true,
    });
    assert.equal(res.status, 400);
    const rows = await pool.query(`SELECT 1 FROM portfolios WHERE username = $1`, [username]);
    assert.equal(rows.rows.length, 0);
    assert.equal(await publicStatus(username), 404);
  });

  await t.test("D6-4. Ordinary portfolio updates still work and never touch publishing state", async () => {
    const res = await updatePortfolio(ownerJwt, portfolioId, {
      title: "Staff Platform Engineer",
      about: "Updated bio",
      template: "professional",
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      portfolio: { title: string; about: string; template: string; published: boolean };
    };
    assert.equal(body.portfolio.title, "Staff Platform Engineer");
    assert.equal(body.portfolio.about, "Updated bio");
    assert.equal(body.portfolio.template, "professional");
    assert.equal(body.portfolio.published, false);
  });

  await t.test("D6-5. Dedicated publish endpoint still works and makes the portfolio public", async () => {
    const res = await publish(ownerJwt, portfolioId);
    assert.equal(res.status, 200);
    const state = await dbState(portfolioId);
    assert.equal(state.published, true);
    assert.ok(state.published_at);
    assert.equal(await publicStatus(ownerUsername), 200);
  });

  await t.test("D6-6. PUT { published: false } on a published portfolio is rejected; it stays public", async () => {
    const before = await dbState(portfolioId);
    const res = await updatePortfolio(ownerJwt, portfolioId, { published: false });
    assert.equal(res.status, 400);
    const after = await dbState(portfolioId);
    assert.equal(after.published, true);
    assert.equal(
      new Date(after.published_at as Date).toISOString(),
      new Date(before.published_at as Date).toISOString()
    );
    assert.equal(await publicStatus(ownerUsername), 200);
  });

  await t.test("D6-7. PUT with published_at / publishedAt is rejected and the timestamp is unchanged", async () => {
    const before = await dbState(portfolioId);
    for (const field of ["published_at", "publishedAt"]) {
      const res = await updatePortfolio(ownerJwt, portfolioId, {
        [field]: "2000-01-01T00:00:00.000Z",
      });
      assert.equal(res.status, 400, `${field} must be rejected`);
      const body = (await res.json()) as { message: string };
      assert.match(body.message, new RegExp(field));
    }
    const after = await dbState(portfolioId);
    assert.equal(
      new Date(after.published_at as Date).toISOString(),
      new Date(before.published_at as Date).toISOString()
    );
  });

  await t.test("D6-8. Dedicated unpublish endpoint still works", async () => {
    const res = await unpublish(ownerJwt, portfolioId);
    assert.equal(res.status, 200);
    const state = await dbState(portfolioId);
    assert.equal(state.published, false);
    assert.ok(state.published_at, "first-publish timestamp retained");
    assert.equal(await publicStatus(ownerUsername), 404);
  });

  await t.test("D6-9. A user cannot modify, publish or unpublish another user's portfolio", async () => {
    const put = await updatePortfolio(otherJwt, portfolioId, { title: "Hijacked" });
    assert.equal(put.status, 403);
    assert.equal((await publish(otherJwt, portfolioId)).status, 403);
    assert.equal((await unpublish(otherJwt, portfolioId)).status, 403);
    // Protected-field attempt by a non-owner is also refused and changes nothing
    const sneaky = await updatePortfolio(otherJwt, portfolioId, { published: true });
    assert.equal(sneaky.status, 400);

    const state = await dbState(portfolioId);
    assert.equal(state.title, "Staff Platform Engineer");
    assert.equal(state.published, false);
  });

  await t.test("D6-10. A failed publish validation never makes the portfolio public", async () => {
    // Legacy rows that predate D5 (reserved username, unsupported template)
    const reservedId = await insertLegacyPortfolio("about");
    const res1 = await publish(ownerJwt, reservedId);
    assert.equal(res1.status, 400);
    assert.equal((await dbState(reservedId)).published, false);
    assert.equal(await publicStatus("about"), 404);

    // The former bypass route is closed too
    const bypass = await updatePortfolio(ownerJwt, reservedId, { published: true });
    assert.equal(bypass.status, 400);
    assert.equal((await dbState(reservedId)).published, false);
    assert.equal(await publicStatus("about"), 404);

    const badTemplateUsername = `d6badtpl_${tag}`;
    const badTplId = await insertLegacyPortfolio(badTemplateUsername, "nonexistent-template");
    const res2 = await publish(ownerJwt, badTplId);
    assert.equal(res2.status, 400);
    assert.equal((await dbState(badTplId)).published, false);
    assert.equal(await publicStatus(badTemplateUsername), 404);
  });

  // ===========================================================
  // D5 – Unified username validation
  // ===========================================================

  const invalidCases: Array<{ label: string; username: string; pattern: RegExp }> = [
    { label: "below minimum length", username: "ab", pattern: /at least 3 characters/i },
    { label: "above maximum length", username: "a".repeat(51), pattern: /cannot exceed 50/i },
    { label: "reserved", username: "about", pattern: /reserved/i },
    { label: "reserved (mixed case)", username: "Dashboard", pattern: /reserved/i },
    { label: "invalid characters", username: "bad.name", pattern: /alphanumeric/i },
  ];

  await t.test("D5-1. Create, update, availability and publish reject the same usernames with the same message", async () => {
    for (const { label, username, pattern } of invalidCases) {
      // Create
      const createRes = await createPortfolio(ownerJwt, {
        name: "Probe",
        title: "Probe",
        username,
      });
      assert.equal(createRes.status, 400, `create should reject ${label}`);
      const createMsg = ((await createRes.json()) as { message: string }).message;
      assert.match(createMsg, pattern, `create message for ${label}`);

      // Update
      const updateRes = await updatePortfolio(ownerJwt, portfolioId, { username });
      assert.equal(updateRes.status, 400, `update should reject ${label}`);
      const updateMsg = ((await updateRes.json()) as { message: string }).message;
      assert.equal(updateMsg, createMsg, `update and create must agree for ${label}`);

      // Availability check
      const checkRes = await checkUsername(ownerJwt, username, portfolioId);
      assert.equal(checkRes.status, 400, `check-username should reject ${label}`);
      const checkMsg = ((await checkRes.json()) as { message: string }).message;
      assert.equal(checkMsg, createMsg, `check-username and create must agree for ${label}`);
    }

    // Nothing was persisted by the rejected updates
    assert.equal((await dbState(portfolioId)).username, ownerUsername);
  });

  await t.test("D5-2. Publishing enforces the same rules on legacy usernames", async () => {
    const shortId = await insertLegacyPortfolio(`x${tag.slice(-1)}`); // 2 chars
    const res = await publish(ownerJwt, shortId);
    assert.equal(res.status, 400);
    const msg = ((await res.json()) as { message: string }).message;
    assert.match(msg, /at least 3 characters/i);
    assert.equal((await dbState(shortId)).published, false);
  });

  await t.test("D5-3. Case-insensitive collisions are rejected on create and update", async () => {
    const createRes = await createPortfolio(ownerJwt, {
      name: "Collider",
      title: "Dev",
      username: otherUsername.toUpperCase(),
    });
    assert.equal(createRes.status, 409);

    const updateRes = await updatePortfolio(ownerJwt, portfolioId, {
      username: otherUsername.toUpperCase(),
    });
    assert.equal(updateRes.status, 409);

    const checkRes = await checkUsername(ownerJwt, otherUsername.toUpperCase(), portfolioId);
    assert.equal(checkRes.status, 200);
    assert.equal(((await checkRes.json()) as { available: boolean }).available, false);
    assert.equal((await dbState(portfolioId)).username, ownerUsername);
  });

  await t.test("D5-4. The owner's existing username stays available during editing", async () => {
    const checkRes = await checkUsername(ownerJwt, ownerUsername.toUpperCase(), portfolioId);
    assert.equal(checkRes.status, 200);
    assert.equal(((await checkRes.json()) as { available: boolean }).available, true);

    const res = await updatePortfolio(ownerJwt, portfolioId, {
      username: ownerUsername.toUpperCase(),
      title: "Re-saved",
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { portfolio: { username: string } };
    assert.equal(body.portfolio.username, ownerUsername, "stored normalized to lowercase");
  });

  await t.test("D5-5. Valid usernames continue to work (normalized, boundary lengths)", async () => {
    // Mixed case + allowed punctuation, normalized to lowercase
    const mixed = `Valid_User-${tag}`;
    const res = await createPortfolio(ownerJwt, { name: "Valid", title: "Dev", username: `  ${mixed}  ` });
    assert.equal(res.status, 201);
    const created = (await res.json()) as { portfolio: { id: string; username: string } };
    createdPortfolioIds.push(created.portfolio.id);
    assert.equal(created.portfolio.username, mixed.toLowerCase());

    // Exactly 50 characters
    const fifty = `v50_${tag}`.padEnd(50, "z");
    assert.equal(fifty.length, 50);
    const res50 = await createPortfolio(ownerJwt, { name: "Fifty", title: "Dev", username: fifty });
    assert.equal(res50.status, 201);
    createdPortfolioIds.push(((await res50.json()) as { portfolio: { id: string } }).portfolio.id);

    // Exactly 3 characters: pick one not already taken in the shared database
    const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
    let three = "";
    for (let i = 0; i < 50 && !three; i++) {
      const candidate =
        "q" +
        alphabet[Math.floor(Math.random() * alphabet.length)] +
        alphabet[Math.floor(Math.random() * alphabet.length)];
      const check = await checkUsername(ownerJwt, candidate);
      if (check.status === 200 && ((await check.json()) as { available: boolean }).available) {
        three = candidate;
      }
    }
    assert.ok(three, "found a free 3-character username");
    const res3 = await createPortfolio(ownerJwt, { name: "Three", title: "Dev", username: three });
    assert.equal(res3.status, 201);
    const id3 = ((await res3.json()) as { portfolio: { id: string } }).portfolio.id;
    createdPortfolioIds.push(id3);

    // A valid username can be published end-to-end
    const pubRes = await publish(ownerJwt, created.portfolio.id);
    assert.equal(pubRes.status, 200);
    assert.equal(await publicStatus(mixed), 200);
  });
});

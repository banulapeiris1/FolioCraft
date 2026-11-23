import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../server";
import { pool } from "../config/database";
import { signToken } from "../utils/auth";
import { runAnimationStyleMigration } from "../db/migrate-animation-style";
import { portfolioService } from "../services/portfolio.service";
import {
  ANIMATION_STYLES,
  createPortfolioSchema,
  normalizeAnimationStyle,
  updatePortfolioSchema,
} from "../utils/validation";
import { AppError } from "../utils/errors";
import type { Portfolio, PublicPortfolioDto } from "../types/portfolio.types";

/**
 * Phase 14 (Stage 4): animation style through the portfolio API —
 * create, retrieve, update (validation + ownership) and the public API.
 */
test("Phase 14: animation style API suite", async (t) => {
  let server: Server;
  let baseUrl = "";
  const suffix = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  let ownerId = "";
  let otherId = "";
  let ownerJwt = "";
  let otherJwt = "";
  let portfolioId = "";
  const username = `anim_api_${suffix}`;
  const createdIds: string[] = [];

  const api = (path: string, init: RequestInit & { jwt?: string } = {}) => {
    const { jwt, headers, ...rest } = init;
    return fetch(`${baseUrl}${path}`, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
        ...(headers as Record<string, string> | undefined),
      },
    });
  };

  const dbStyle = async (id = portfolioId) =>
    (await pool.query<{ animation_style: string }>("SELECT animation_style FROM portfolios WHERE id = $1", [id]))
      .rows[0]!.animation_style;

  const put = (body: unknown, jwt = ownerJwt, id = portfolioId) =>
    api(`/api/portfolios/${id}`, { method: "PUT", jwt, body: JSON.stringify(body) });

  t.before(async () => {
    await runAnimationStyleMigration();
    server = app.listen(0);
    baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`;

    const u1 = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id`,
      ["Animation Owner", `anim_owner_${suffix}@foliocraft.test`, "hashed_pw"]
    );
    ownerId = u1.rows[0]!.id;
    ownerJwt = signToken({ userId: ownerId });
    const u2 = await pool.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id`,
      ["Animation Intruder", `anim_other_${suffix}@foliocraft.test`, "hashed_pw"]
    );
    otherId = u2.rows[0]!.id;
    otherJwt = signToken({ userId: otherId });
  });

  t.after(async () => {
    server.close();
    try {
      for (const id of createdIds) await pool.query("DELETE FROM portfolios WHERE id = $1", [id]);
      for (const id of [ownerId, otherId]) if (id) await pool.query("DELETE FROM users WHERE id = $1", [id]);
    } catch (e) {
      console.error("Cleanup error in animationStyle.routes.test.ts:", e);
    }
  });

  // -------------------------------------------------------------------------
  // Validation units
  // -------------------------------------------------------------------------

  await t.test("V1. Schemas accept exactly subtle / creative / minimal", () => {
    assert.deepEqual([...ANIMATION_STYLES], ["subtle", "creative", "minimal"]);
    for (const style of ANIMATION_STYLES) {
      assert.equal(updatePortfolioSchema.safeParse({ animationStyle: style }).success, true, style);
      assert.equal(
        createPortfolioSchema.safeParse({ name: "N", title: "T", username: "valid_user", animationStyle: style }).success,
        true,
        style
      );
    }
    for (const bad of ["none", "Creative", " subtle", "", "fast", 1, null, true, {}, ["subtle"]]) {
      const result = updatePortfolioSchema.safeParse({ animationStyle: bad });
      assert.equal(result.success, false, `rejects ${JSON.stringify(bad)}`);
      if (!result.success) assert.match(result.error.issues[0]!.message, /Animation style must be one of/);
    }
  });

  await t.test("V2. Missing / null / unknown stored values normalise to 'subtle'", () => {
    assert.equal(normalizeAnimationStyle(undefined), "subtle");
    assert.equal(normalizeAnimationStyle(null), "subtle");
    assert.equal(normalizeAnimationStyle("none"), "subtle");
    assert.equal(normalizeAnimationStyle("creative"), "creative");
  });

  // -------------------------------------------------------------------------
  // Create & retrieve
  // -------------------------------------------------------------------------

  await t.test("C1. Creating without animationStyle stores and returns 'subtle'", async () => {
    const res = await api("/api/portfolios", {
      method: "POST",
      jwt: ownerJwt,
      body: JSON.stringify({ name: "Motion Owner", title: "Designer", username, template: "modern" }),
    });
    assert.equal(res.status, 201);
    const { portfolio } = (await res.json()) as { portfolio: Portfolio };
    portfolioId = portfolio.id;
    createdIds.push(portfolio.id);
    assert.equal(portfolio.animationStyle, "subtle");
    assert.equal(await dbStyle(), "subtle");
  });

  await t.test("C2. Creating with a valid style stores it; invalid style is rejected (400)", async () => {
    const ok = await api("/api/portfolios", {
      method: "POST",
      jwt: ownerJwt,
      body: JSON.stringify({ name: "N", title: "T", username: `anim_c2_${suffix}`, animationStyle: "creative" }),
    });
    assert.equal(ok.status, 201);
    const { portfolio } = (await ok.json()) as { portfolio: Portfolio };
    createdIds.push(portfolio.id);
    assert.equal(portfolio.animationStyle, "creative");
    assert.equal(await dbStyle(portfolio.id), "creative");

    const bad = await api("/api/portfolios", {
      method: "POST",
      jwt: ownerJwt,
      body: JSON.stringify({ name: "N", title: "T", username: `anim_c2b_${suffix}`, animationStyle: "none" }),
    });
    assert.equal(bad.status, 400);
    const exists = await pool.query("SELECT 1 FROM portfolios WHERE username = $1", [`anim_c2b_${suffix}`]);
    assert.equal(exists.rows.length, 0, "rejected create must not persist");
  });

  await t.test("R1. GET /api/portfolios/:id and GET /api/portfolios return animationStyle", async () => {
    const one = await api(`/api/portfolios/${portfolioId}`, { jwt: ownerJwt });
    assert.equal(one.status, 200);
    assert.equal(((await one.json()) as { portfolio: Portfolio }).portfolio.animationStyle, "subtle");

    const list = await api("/api/portfolios", { jwt: ownerJwt });
    assert.equal(list.status, 200);
    const { portfolios } = (await list.json()) as { portfolios: Portfolio[] };
    const mine = portfolios.find((p) => p.id === portfolioId);
    assert.ok(mine);
    assert.equal(mine.animationStyle, "subtle");
  });

  // -------------------------------------------------------------------------
  // Update
  // -------------------------------------------------------------------------

  await t.test("U1. Owner can update animationStyle alone; content is unchanged", async () => {
    const before = (await pool.query("SELECT name, title, about, username, template, social_links FROM portfolios WHERE id = $1", [portfolioId])).rows[0];
    for (const style of ["creative", "minimal", "subtle", "creative"] as const) {
      const res = await put({ animationStyle: style });
      assert.equal(res.status, 200, style);
      const { portfolio } = (await res.json()) as { portfolio: Portfolio };
      assert.equal(portfolio.animationStyle, style);
      assert.equal(await dbStyle(), style);
    }
    const after = (await pool.query("SELECT name, title, about, username, template, social_links FROM portfolios WHERE id = $1", [portfolioId])).rows[0];
    assert.deepEqual(after, before, "changing animation style must not modify portfolio content");
  });

  await t.test("U2. Unsupported values are rejected with 400 and nothing changes", async () => {
    for (const bad of ["none", "CREATIVE", "bouncy", "", " minimal", 42, null, false, {}]) {
      const res = await put({ animationStyle: bad });
      assert.equal(res.status, 400, `rejects ${JSON.stringify(bad)}`);
      const body = (await res.json()) as { message: string };
      assert.match(body.message, /Animation style must be one of: subtle, creative, minimal/);
      assert.equal(await dbStyle(), "creative", "stored style unchanged");
    }
  });

  await t.test("U3. An invalid style blocks the whole update (no partial content write)", async () => {
    const res = await put({ name: "Should Not Save", animationStyle: "turbo" });
    assert.equal(res.status, 400);
    const row = (await pool.query<{ name: string }>("SELECT name FROM portfolios WHERE id = $1", [portfolioId])).rows[0]!;
    assert.equal(row.name, "Motion Owner");
  });

  await t.test("U4. Content updates preserve the saved animationStyle", async () => {
    const res = await put({ title: "Senior Designer", template: "bento" });
    assert.equal(res.status, 200);
    const { portfolio } = (await res.json()) as { portfolio: Portfolio };
    assert.equal(portfolio.title, "Senior Designer");
    assert.equal(portfolio.animationStyle, "creative");
    assert.equal(await dbStyle(), "creative");
  });

  await t.test("U5. Another user cannot change the style (403); anonymous gets 401", async () => {
    const forbidden = await put({ animationStyle: "minimal" }, otherJwt);
    assert.equal(forbidden.status, 403);
    const anonymous = await api(`/api/portfolios/${portfolioId}`, {
      method: "PUT",
      body: JSON.stringify({ animationStyle: "minimal" }),
    });
    assert.equal(anonymous.status, 401);
    assert.equal(await dbStyle(), "creative", "unauthorised attempts change nothing");

    const peek = await api(`/api/portfolios/${portfolioId}`, { jwt: otherJwt });
    assert.equal(peek.status, 403, "another user cannot read the setting either");
  });

  await t.test("U6. Service rejects an invalid style even when the controller is bypassed", async () => {
    await assert.rejects(
      () => portfolioService.updatePortfolio(portfolioId, ownerId, { animationStyle: "none" as never }),
      (err: unknown) => err instanceof AppError && err.statusCode === 400
    );
    await assert.rejects(
      () =>
        portfolioService.createPortfolio(ownerId, {
          name: "N",
          title: "T",
          username: `anim_svc_${suffix}`,
          animationStyle: "wild" as never,
        }),
      (err: unknown) => err instanceof AppError && err.statusCode === 400
    );
    assert.equal(await dbStyle(), "creative");
  });

  // -------------------------------------------------------------------------
  // Publishing & public API
  // -------------------------------------------------------------------------

  await t.test("P1. Unpublished portfolio is not exposed publicly (404)", async () => {
    const res = await api(`/api/public/${username}`);
    assert.equal(res.status, 404);
  });

  await t.test("P2. Public API returns the saved style after publishing, without private fields", async () => {
    const pub = await api(`/api/portfolios/${portfolioId}/publish`, { method: "POST", jwt: ownerJwt });
    assert.equal(pub.status, 200);
    assert.equal(await dbStyle(), "creative", "publishing preserves the style");

    const res = await api(`/api/public/${username}`);
    assert.equal(res.status, 200);
    const { portfolio } = (await res.json()) as { portfolio: PublicPortfolioDto & Record<string, unknown> };
    assert.equal(portfolio.animationStyle, "creative");
    for (const privateKey of ["userId", "user_id", "id", "passwordHash", "password_hash", "createdAt"]) {
      assert.equal(privateKey in portfolio, false, `${privateKey} must not be exposed`);
    }
  });

  await t.test("P3. Every style round-trips: update -> public API", async () => {
    for (const style of ANIMATION_STYLES) {
      assert.equal((await put({ animationStyle: style })).status, 200);
      const res = await api(`/api/public/${username.toUpperCase()}`);
      assert.equal(res.status, 200);
      const { portfolio } = (await res.json()) as { portfolio: PublicPortfolioDto };
      assert.equal(portfolio.animationStyle, style, `public API serves ${style}`);
    }
  });

  await t.test("P4. Unpublish + republish keeps the saved style", async () => {
    assert.equal((await put({ animationStyle: "minimal" })).status, 200);
    assert.equal((await api(`/api/portfolios/${portfolioId}/unpublish`, { method: "POST", jwt: ownerJwt })).status, 200);
    assert.equal((await api(`/api/public/${username}`)).status, 404);
    assert.equal((await api(`/api/portfolios/${portfolioId}/publish`, { method: "POST", jwt: ownerJwt })).status, 200);
    const res = await api(`/api/public/${username}`);
    const { portfolio } = (await res.json()) as { portfolio: PublicPortfolioDto };
    assert.equal(portfolio.animationStyle, "minimal");
  });
});

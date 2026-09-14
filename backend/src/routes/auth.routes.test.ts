import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../server";
import { pool } from "../config/database";
import { signToken } from "../utils/auth";

test("AUTH-03: HTTP Route End-to-End Suite", async (t) => {
  let server: Server;
  let baseUrl: string;

  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const testUser = {
    name: "API Test User",
    email: `route_test_${uniqueSuffix}@foliocraft.test`,
    password: "Password123!",
  };

  t.before(async () => {
    server = app.listen(0);
    const address = server.address() as AddressInfo;
    baseUrl = `http://localhost:${address.port}`;
  });

  t.after(async () => {
    server.close();
    try {
      await pool.query("DELETE FROM users WHERE email LIKE 'route_test_%@foliocraft.test'");
    } catch (e) {
      console.error("Cleanup error in route tests:", e);
    }
  });

  await t.test("POST /api/auth/register - 201 Created on valid input", async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testUser),
    });

    assert.equal(res.status, 201);
    const body = (await res.json()) as Record<string, unknown>;

    assert.ok(body.token);
    assert.ok(body.user);
    const user = body.user as Record<string, unknown>;
    assert.equal(user.name, testUser.name);
    assert.equal(user.email, testUser.email);
    assert.ok(user.id);
    assert.equal(user.password_hash, undefined, "password_hash must NOT be in response");
    assert.equal(body.password_hash, undefined, "password_hash must NOT be in response");
  });

  await t.test("POST /api/auth/register - 400 Bad Request on validation error", async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "invalid-email", password: "short" }),
    });

    assert.equal(res.status, 400);
    const body = (await res.json()) as { message: string };
    assert.ok(body.message);
  });

  await t.test("POST /api/auth/register - 409 Conflict on duplicate email", async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testUser),
    });

    assert.equal(res.status, 409);
    const body = (await res.json()) as { message: string };
    assert.match(body.message, /already exists/i);
  });

  await t.test("POST /api/auth/login - 200 OK on correct credentials", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password,
      }),
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as Record<string, unknown>;
    assert.ok(body.token);
    assert.ok(body.user);
    const user = body.user as Record<string, unknown>;
    assert.equal(user.email, testUser.email);
    assert.equal(user.password_hash, undefined);
  });

  await t.test("POST /api/auth/login - 401 Unauthorized on wrong password", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testUser.email,
        password: "IncorrectPassword999!",
      }),
    });

    assert.equal(res.status, 401);
    const body = (await res.json()) as { message: string };
    assert.equal(body.message, "Invalid email or password");
  });

  await t.test("POST /api/auth/login - 401 Unauthorized on unknown email", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "unknown_user_12345@foliocraft.test",
        password: testUser.password,
      }),
    });

    assert.equal(res.status, 401);
    const body = (await res.json()) as { message: string };
    assert.equal(body.message, "Invalid email or password");
  });

  // AUTH-05A: GET /api/auth/me Tests
  let validAuthToken: string;
  let createdUserId: string;

  await t.test("AUTH-05A: Register test user to obtain valid JWT", async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Me Test User",
        email: `route_me_${uniqueSuffix}@foliocraft.test`,
        password: "Password123!",
      }),
    });

    assert.equal(res.status, 201);
    const body = (await res.json()) as { token: string; user: { id: string } };
    validAuthToken = body.token;
    createdUserId = body.user.id;
    assert.ok(validAuthToken);
    assert.ok(createdUserId);
  });

  await t.test("GET /api/auth/me - 200 OK with valid JWT returns safe user object", async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${validAuthToken}`,
      },
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as { user: Record<string, unknown> };
    assert.ok(body.user);
    assert.equal(body.user.id, createdUserId);
    assert.equal(body.user.name, "Me Test User");
    assert.equal(body.user.email, `route_me_${uniqueSuffix}@foliocraft.test`);
    assert.ok(body.user.created_at);
    assert.ok(body.user.updated_at);
    assert.equal(body.user.password_hash, undefined, "password_hash must NOT be in user object");
    assert.equal((body as Record<string, unknown>).password_hash, undefined, "password_hash must NOT be at root");
  });

  await t.test("GET /api/auth/me - 401 Unauthorized without Authorization header", async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      method: "GET",
    });

    assert.equal(res.status, 401);
    const body = (await res.json()) as { message: string };
    assert.equal(body.message, "Authentication required");
  });

  await t.test("GET /api/auth/me - 401 Unauthorized with invalid JWT format", async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      method: "GET",
      headers: {
        Authorization: "Bearer invalid.jwt.token",
      },
    });

    assert.equal(res.status, 401);
    const body = (await res.json()) as { message: string };
    assert.equal(body.message, "Authentication required");
  });

  await t.test("GET /api/auth/me - 401 Unauthorized with tampered JWT", async () => {
    const tamperedToken = validAuthToken.slice(0, -5) + "abcde";
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tamperedToken}`,
      },
    });

    assert.equal(res.status, 401);
    const body = (await res.json()) as { message: string };
    assert.equal(body.message, "Authentication required");
  });

  await t.test("GET /api/auth/me - 404 Not Found when authenticated user does not exist", async () => {
    const nonExistentUserId = "00000000-0000-4000-8000-000000000000";
    const orphanedToken = signToken({ userId: nonExistentUserId });

    const res = await fetch(`${baseUrl}/api/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${orphanedToken}`,
      },
    });

    assert.equal(res.status, 404);
    const body = (await res.json()) as { message: string };
    assert.equal(body.message, "User not found");
  });
});

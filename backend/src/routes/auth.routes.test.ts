import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "../server";
import { pool } from "../config/database";

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
});

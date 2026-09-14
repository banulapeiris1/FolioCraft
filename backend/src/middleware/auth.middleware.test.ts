import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { authMiddleware } from "./auth.middleware";
import { signToken } from "../utils/auth";

interface MockContext {
  req: Request;
  res: Response;
  next: NextFunction;
  getStatusCode: () => number;
  getJsonBody: () => unknown;
  isNextCalled: () => boolean;
}

function createMockContext(authorizationHeader?: string): MockContext {
  const req = {
    headers: authorizationHeader !== undefined ? { authorization: authorizationHeader } : {},
    user: undefined,
  } as unknown as Request;

  let statusCode = 200;
  let jsonBody: unknown = null;
  let nextCalled = false;

  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(data: unknown) {
      jsonBody = data;
      return this;
    },
  } as unknown as Response;

  const next: NextFunction = () => {
    nextCalled = true;
  };

  return {
    req,
    res,
    next,
    getStatusCode: () => statusCode,
    getJsonBody: () => jsonBody,
    isNextCalled: () => nextCalled,
  };
}

test("AUTH-04: JWT Authentication Middleware Suite", async (t) => {
  const testUserId = "550e8400-e29b-41d4-a716-446655440000";

  await t.test("1. Missing Authorization header returns 401 with generic message", () => {
    const ctx = createMockContext(undefined);
    authMiddleware(ctx.req, ctx.res, ctx.next);

    assert.equal(ctx.getStatusCode(), 401);
    assert.deepEqual(ctx.getJsonBody(), { message: "Authentication required" });
    assert.equal(ctx.isNextCalled(), false);
    assert.equal(ctx.req.user, undefined);
  });

  await t.test("2. Invalid authorization scheme returns 401 with generic message", () => {
    const schemes = ["Basic dXNlcjpwYXNz", "Token abc123xyz", "Digest 12345", "CustomAuthToken"];
    for (const header of schemes) {
      const ctx = createMockContext(header);
      authMiddleware(ctx.req, ctx.res, ctx.next);

      assert.equal(ctx.getStatusCode(), 401, `Expected 401 for header: ${header}`);
      assert.deepEqual(ctx.getJsonBody(), { message: "Authentication required" });
      assert.equal(ctx.isNextCalled(), false);
    }
  });

  await t.test("3. Missing Bearer token returns 401 with generic message", () => {
    const ctx = createMockContext("Bearer");
    authMiddleware(ctx.req, ctx.res, ctx.next);

    assert.equal(ctx.getStatusCode(), 401);
    assert.deepEqual(ctx.getJsonBody(), { message: "Authentication required" });
    assert.equal(ctx.isNextCalled(), false);
  });

  await t.test("4. Empty Bearer token with whitespace returns 401 with generic message", () => {
    const ctx = createMockContext("Bearer    ");
    authMiddleware(ctx.req, ctx.res, ctx.next);

    assert.equal(ctx.getStatusCode(), 401);
    assert.deepEqual(ctx.getJsonBody(), { message: "Authentication required" });
    assert.equal(ctx.isNextCalled(), false);
  });

  await t.test("5. Malformed JWT returns 401 with generic message", () => {
    const ctx = createMockContext("Bearer not.a.valid.jwt.token");
    authMiddleware(ctx.req, ctx.res, ctx.next);

    assert.equal(ctx.getStatusCode(), 401);
    assert.deepEqual(ctx.getJsonBody(), { message: "Authentication required" });
    assert.equal(ctx.isNextCalled(), false);
  });

  await t.test("6. Tampered JWT returns 401 with generic message", () => {
    const validToken = signToken({ userId: testUserId });
    const parts = validToken.split(".");
    const tamperedToken = `${parts[0]}.${parts[1]}.tamperedSignature`;

    const ctx = createMockContext(`Bearer ${tamperedToken}`);
    authMiddleware(ctx.req, ctx.res, ctx.next);

    assert.equal(ctx.getStatusCode(), 401);
    assert.deepEqual(ctx.getJsonBody(), { message: "Authentication required" });
    assert.equal(ctx.isNextCalled(), false);
  });

  await t.test("7. Expired JWT returns 401 with generic message", () => {
    const secret = process.env.JWT_SECRET as string;
    // Sign token that expired 10 seconds ago
    const expiredToken = jwt.sign({ userId: testUserId }, secret, { expiresIn: "-10s" });

    const ctx = createMockContext(`Bearer ${expiredToken}`);
    authMiddleware(ctx.req, ctx.res, ctx.next);

    assert.equal(ctx.getStatusCode(), 401);
    assert.deepEqual(ctx.getJsonBody(), { message: "Authentication required" });
    assert.equal(ctx.isNextCalled(), false);
  });

  await t.test("8. Valid JWT invokes next()", () => {
    const validToken = signToken({ userId: testUserId });

    const ctx = createMockContext(`Bearer ${validToken}`);
    authMiddleware(ctx.req, ctx.res, ctx.next);

    assert.equal(ctx.isNextCalled(), true, "next() must be called on valid token");
    assert.equal(ctx.getStatusCode(), 200, "Response status should remain untouched");
  });

  await t.test("9. Valid JWT attaches req.user with verified userId", () => {
    const validToken = signToken({ userId: testUserId });

    const ctx = createMockContext(`Bearer ${validToken}`);
    authMiddleware(ctx.req, ctx.res, ctx.next);

    assert.ok(ctx.req.user, "req.user must be defined");
    assert.equal(ctx.req.user?.userId, testUserId);
    assert.equal(Object.keys(ctx.req.user || {}).length, 1, "req.user must contain only userId");
  });

  await t.test("10. Internal JWT verification error is NOT exposed to client", () => {
    // Check multiple failure scenarios ensuring message is always the same generic string
    const testCases = [
      "Bearer malformed",
      "Bearer eyJhbGciOi.invalid.payload",
      "Bearer " + jwt.sign({ userId: testUserId }, "wrong_secret"),
    ];

    for (const authHeader of testCases) {
      const ctx = createMockContext(authHeader);
      authMiddleware(ctx.req, ctx.res, ctx.next);

      const body = ctx.getJsonBody() as { message?: string };
      assert.equal(body.message, "Authentication required");
      assert.doesNotMatch(JSON.stringify(body), /jwt|malformed|signature|expired|JsonWebTokenError/i);
    }
  });
});

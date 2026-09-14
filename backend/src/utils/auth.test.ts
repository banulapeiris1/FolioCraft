import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { hashPassword, comparePassword, signToken, verifyToken } from "./auth";
import type { JwtPayload } from "../types/auth.types";

test("Password Hashing & Comparison Suite", async (t) => {
  await t.test("hashPassword should return a valid bcrypt hash", async () => {
    const password = "SuperSecretPassword123!";
    const hash = await hashPassword(password);

    assert.ok(hash, "Hash should be defined and non-empty");
    assert.notEqual(hash, password, "Hash must not match plaintext password");
    assert.match(hash, /^\$2[aby]\$\d{2}\$/, "Hash must match bcrypt hash pattern");
  });

  await t.test("hashPassword should produce unique hashes for identical passwords due to salt", async () => {
    const password = "SamePassword123";
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    assert.notEqual(hash1, hash2, "Bcrypt hashes should differ due to unique salts");
  });

  await t.test("comparePassword should return true for correct password", async () => {
    const password = "CorrectPassword123";
    const hash = await hashPassword(password);
    const isMatch = await comparePassword(password, hash);

    assert.equal(isMatch, true, "comparePassword should return true for correct password");
  });

  await t.test("comparePassword should return false for incorrect password", async () => {
    const password = "CorrectPassword123";
    const wrongPassword = "WrongPassword456";
    const hash = await hashPassword(password);
    const isMatch = await comparePassword(wrongPassword, hash);

    assert.equal(isMatch, false, "comparePassword should return false for incorrect password");
  });

  await t.test("comparePassword should return false for empty inputs", async () => {
    const isMatch1 = await comparePassword("", "someHash");
    const isMatch2 = await comparePassword("password", "");

    assert.equal(isMatch1, false);
    assert.equal(isMatch2, false);
  });
});

test("JWT Token Generation & Verification Suite", async (t) => {
  const payload: JwtPayload = {
    userId: "123e4567-e89b-12d3-a456-426614174000",
  };

  await t.test("signToken should return a valid 3-part dot-separated JWT", () => {
    const token = signToken(payload);

    assert.ok(token, "Token should be non-empty");
    const parts = token.split(".");
    assert.equal(parts.length, 3, "JWT must consist of header, payload, and signature");
  });

  await t.test("verifyToken should decode valid token and match original payload", () => {
    const token = signToken(payload);
    const decoded = verifyToken(token);

    assert.equal(decoded.userId, payload.userId, "Decoded userId must match original");
  });

  await t.test("verifyToken should reject tampered tokens", () => {
    const token = signToken(payload);
    // Tamper with the signature segment (last segment)
    const parts = token.split(".");
    const tamperedToken = `${parts[0]}.${parts[1]}.tamperedSignature`;

    assert.throws(
      () => verifyToken(tamperedToken),
      /invalid signature|jwt malformed/i,
      "verifyToken must throw an error when signature has been modified"
    );
  });

  await t.test("verifyToken should reject malformed tokens", () => {
    assert.throws(
      () => verifyToken("not-a-valid-jwt-token"),
      /jwt malformed/i,
      "verifyToken must throw on malformed token string"
    );
  });

  await t.test("verifyToken should reject payloads missing userId", () => {
    const secret = process.env.JWT_SECRET as string;
    const invalidToken = jwt.sign({ role: "admin" }, secret, { expiresIn: "1h" });

    assert.throws(
      () => verifyToken(invalidToken),
      /invalid token payload structure/i,
      "verifyToken must throw when userId is missing from payload"
    );
  });

  await t.test("verifyToken should reject payloads with non-string or empty userId", () => {
    const secret = process.env.JWT_SECRET as string;
    const numericIdToken = jwt.sign({ userId: 12345 }, secret, { expiresIn: "1h" });
    const emptyIdToken = jwt.sign({ userId: "   " }, secret, { expiresIn: "1h" });

    assert.throws(
      () => verifyToken(numericIdToken),
      /invalid token payload structure/i,
      "verifyToken must throw when userId is a number"
    );

    assert.throws(
      () => verifyToken(emptyIdToken),
      /invalid token payload structure/i,
      "verifyToken must throw when userId is empty whitespace"
    );
  });
});

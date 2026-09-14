import test from "node:test";
import assert from "node:assert/strict";
import { pool } from "../config/database";
import { authService } from "./auth.service";
import { verifyToken } from "../utils/auth";
import { registerSchema, loginSchema } from "../utils/validation";
import { AppError } from "../utils/errors";

test("AUTH-03: Validation Rules Suite", async (t) => {
  await t.test("registerSchema rejects missing or empty name", () => {
    const res1 = registerSchema.safeParse({ email: "user@test.com", password: "Password123!" });
    assert.equal(res1.success, false);

    const res2 = registerSchema.safeParse({ name: "   ", email: "user@test.com", password: "Password123!" });
    assert.equal(res2.success, false);
  });

  await t.test("registerSchema rejects invalid email formats", () => {
    const invalidEmails = ["not-an-email", "missing@domain", "@nodomain.com", "spaces in@email.com"];
    for (const email of invalidEmails) {
      const res = registerSchema.safeParse({ name: "Alex", email, password: "Password123!" });
      assert.equal(res.success, false, `Expected ${email} to fail validation`);
    }
  });

  await t.test("registerSchema rejects passwords shorter than 8 characters", () => {
    const res = registerSchema.safeParse({ name: "Alex", email: "alex@test.com", password: "short" });
    assert.equal(res.success, false);
  });

  await t.test("registerSchema normalizes email to lowercase and trims name", () => {
    const res = registerSchema.safeParse({
      name: "  Alex Chen  ",
      email: "  ALEX.Chen@Example.COM  ",
      password: "Password123!",
    });
    assert.equal(res.success, true);
    if (res.success) {
      assert.equal(res.data.name, "Alex Chen");
      assert.equal(res.data.email, "alex.chen@example.com");
    }
  });

  await t.test("loginSchema rejects invalid email and empty password", () => {
    const res1 = loginSchema.safeParse({ email: "invalid", password: "Password123!" });
    assert.equal(res1.success, false);

    const res2 = loginSchema.safeParse({ email: "user@test.com", password: "" });
    assert.equal(res2.success, false);
  });
});

test("AUTH-03: Register & Login Service Integration Suite", async (t) => {
  const uniqueTag = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const testEmail = `test_${uniqueTag}@foliocraft.test`;
  const rawPassword = "SecurePassword123!";
  const testName = "Test Developer";

  // Clean up any test users created by this run
  t.after(async () => {
    try {
      await pool.query("DELETE FROM users WHERE email LIKE 'test_%@foliocraft.test'");
    } catch (e) {
      console.error("Cleanup error:", e);
    }
  });

  await t.test("1. Successful Registration creates user, returns token and safe user object", async () => {
    const response = await authService.register({
      name: testName,
      email: testEmail,
      password: rawPassword,
    });

    assert.ok(response.token, "Token must be present");
    assert.ok(response.user, "User must be present");
    assert.equal(response.user.name, testName);
    assert.equal(response.user.email, testEmail);
    assert.ok(response.user.id, "User ID must be returned");

    // 7. Response does not contain password_hash
    assert.equal((response.user as Record<string, unknown>).password_hash, undefined, "password_hash must never be in response");
    assert.equal((response as Record<string, unknown>).password_hash, undefined, "password_hash must never be in response");

    // 14. Returned token can be verified using JWT utility
    const decoded = verifyToken(response.token);
    assert.equal(decoded.userId, response.user.id);
  });

  await t.test("6. Stored password in PostgreSQL is hashed with bcrypt, NOT plaintext", async () => {
    const dbUser = await pool.query<{ password_hash: string }>(
      "SELECT password_hash FROM users WHERE email = $1",
      [testEmail]
    );

    assert.equal(dbUser.rowCount, 1);
    const hash = dbUser.rows[0]?.password_hash;
    assert.ok(hash, "Database row must have password_hash");
    assert.notEqual(hash, rawPassword, "Database password must not be stored in plaintext");
    assert.match(hash, /^\$2[aby]\$\d{2}\$/, "Stored password must be a valid bcrypt hash");
  });

  await t.test("5. Duplicate email registration throws 409 Conflict", async () => {
    await assert.rejects(
      async () => {
        await authService.register({
          name: "Another Name",
          email: testEmail.toUpperCase(), // Test case insensitivity
          password: "AnotherPassword123!",
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        assert.equal((err as AppError).statusCode, 409);
        assert.match((err as AppError).message, /already exists/i);
        return true;
      }
    );
  });

  await t.test("8. Successful Login returns safe user and valid token", async () => {
    const response = await authService.login({
      email: testEmail,
      password: rawPassword,
    });

    assert.ok(response.token, "Token must be present");
    assert.ok(response.user, "User must be present");
    assert.equal(response.user.email, testEmail);

    // 13. Response does not contain password_hash
    assert.equal((response.user as Record<string, unknown>).password_hash, undefined);
    assert.equal((response as Record<string, unknown>).password_hash, undefined);

    const decoded = verifyToken(response.token);
    assert.equal(decoded.userId, response.user.id);
  });

  let incorrectPasswordError: AppError | null = null;
  await t.test("9. Incorrect password throws generic 401 Unauthorized", async () => {
    await assert.rejects(
      async () => {
        await authService.login({
          email: testEmail,
          password: "WrongPassword123!",
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        incorrectPasswordError = err as AppError;
        assert.equal((err as AppError).statusCode, 401);
        assert.equal((err as AppError).message, "Invalid email or password");
        return true;
      }
    );
  });

  let unknownEmailError: AppError | null = null;
  await t.test("10. Unknown email throws generic 401 Unauthorized", async () => {
    await assert.rejects(
      async () => {
        await authService.login({
          email: "nonexistent_user_9999@foliocraft.test",
          password: rawPassword,
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof AppError);
        unknownEmailError = err as AppError;
        assert.equal((err as AppError).statusCode, 401);
        assert.equal((err as AppError).message, "Invalid email or password");
        return true;
      }
    );
  });

  await t.test("Identical Error Response: Unknown email and wrong password produce identical status and message", () => {
    assert.ok(incorrectPasswordError);
    assert.ok(unknownEmailError);
    assert.equal(incorrectPasswordError?.statusCode, unknownEmailError?.statusCode);
    assert.equal(incorrectPasswordError?.message, unknownEmailError?.message);
  });
});

import "dotenv/config";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "../types/auth.types";

const SALT_ROUNDS = 10;

/**
 * Hashes a plaintext password using bcrypt.
 * The cost factor of 10 specifies 2^10 key expansion rounds in the Eksblowfish cipher,
 * deliberately slowing hash computation to resist brute-force attacks.
 * @param password Plaintext password to hash
 * @returns Promise resolving to the hashed password string
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password) {
    throw new Error("Password must not be empty");
  }
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compares a plaintext password against a stored bcrypt password hash.
 * @param password Plaintext password provided by user
 * @param passwordHash Stored hash from the database
 * @returns Promise resolving to boolean indicating match
 */
export async function comparePassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  if (!password || !passwordHash) {
    return false;
  }
  return bcrypt.compare(password, passwordHash);
}

/**
 * Retrieves the configured JWT secret from environment variables.
 * Throws an error if JWT_SECRET is not configured to prevent signing with insecure fallbacks.
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }
  return secret;
}

/**
 * Retrieves the configured JWT expiry duration from environment variables.
 * Throws an error if JWT_EXPIRES_IN is not configured to prevent silent fallback assumptions.
 */
function getJwtExpiresIn(): string {
  const expiresIn = process.env.JWT_EXPIRES_IN;
  if (!expiresIn) {
    throw new Error("JWT_EXPIRES_IN is not defined in environment variables");
  }
  return expiresIn;
}

/**
 * Signs a JSON Web Token with user identity payload.
 * @param payload Minimum required identity information (userId)
 * @returns Encoded JWT string
 */
export function signToken(payload: JwtPayload): string {
  const secret = getJwtSecret();
  const expiresIn = getJwtExpiresIn();

  const options: jwt.SignOptions = {
    expiresIn: expiresIn as jwt.SignOptions["expiresIn"],
  };

  return jwt.sign(payload, secret, options);
}

/**
 * Verifies and decodes a JSON Web Token.
 * Validates token signature, expiration, and ensures payload contains a valid non-empty userId string.
 * @param token Encoded JWT string
 * @returns Decoded and validated JwtPayload
 */
export function verifyToken(token: string): JwtPayload {
  const secret = getJwtSecret();
  const decoded = jwt.verify(token, secret);

  if (
    typeof decoded !== "object" ||
    decoded === null ||
    !("userId" in decoded) ||
    typeof (decoded as { userId: unknown }).userId !== "string" ||
    (decoded as { userId: string }).userId.trim() === ""
  ) {
    throw new Error("Invalid token payload structure");
  }

  return {
    userId: (decoded as { userId: string }).userId,
  };
}

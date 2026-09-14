import { pool } from "../config/database";
import { hashPassword, comparePassword, signToken } from "../utils/auth";
import { AppError } from "../utils/errors";
import type {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  AuthUser,
} from "../types/auth.types";

export class AuthService {
  /**
   * Registers a new user account.
   * Checks for email collisions, securely hashes the password, persists the user,
   * and generates a JWT.
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const normalizedEmail = data.email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existingUser.rowCount && existingUser.rowCount > 0) {
      throw new AppError("User with this email already exists", 409);
    }

    // Hash the password with bcrypt
    const passwordHash = await hashPassword(data.password);

    // Insert user into database
    const insertResult = await pool.query<AuthUser>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email`,
      [data.name.trim(), normalizedEmail, passwordHash]
    );

    const createdUser = insertResult.rows[0];
    if (!createdUser) {
      throw new AppError("Failed to create user account", 500);
    }

    // Generate JWT token containing strictly userId
    const token = signToken({ userId: createdUser.id });

    return {
      user: {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
      },
      token,
    };
  }

  /**
   * Authenticates an existing user.
   * Performs constant-time password comparison and issues a JWT on match.
   * Returns generic 401 for both unknown emails and incorrect passwords.
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    const normalizedEmail = data.email.trim().toLowerCase();

    // Retrieve user by email
    const userResult = await pool.query<{
      id: string;
      name: string;
      email: string;
      password_hash: string;
    }>(
      `SELECT id, name, email, password_hash
       FROM users
       WHERE email = $1`,
      [normalizedEmail]
    );

    const user = userResult.rows[0];

    // Generic error message to prevent account enumeration
    const genericAuthError = new AppError("Invalid email or password", 401);

    if (!user) {
      throw genericAuthError;
    }

    // Verify password against stored bcrypt hash
    const isPasswordValid = await comparePassword(
      data.password,
      user.password_hash
    );

    if (!isPasswordValid) {
      throw genericAuthError;
    }

    // Generate JWT token containing strictly userId
    const token = signToken({ userId: user.id });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      token,
    };
  }

  /**
   * Retrieves the current user profile by userId.
   * Queries the users table using a parameterized query.
   * Returns only safe fields (id, name, email, created_at, updated_at).
   * Does NOT return password_hash.
   * Throws 404 AppError if user does not exist.
   */
  async getCurrentUser(userId: string): Promise<AuthUser> {
    // Validate UUID format to prevent PostgreSQL 22P02 syntax errors on malformed IDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      throw new AppError("User not found", 404);
    }

    const result = await pool.query<AuthUser>(
      `SELECT id, name, email, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [userId]
    );

    const user = result.rows[0];
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const safeUser: AuthUser = {
      id: user.id,
      name: user.name,
      email: user.email,
    };

    if (user.created_at !== undefined) {
      safeUser.created_at = user.created_at;
    }
    if (user.updated_at !== undefined) {
      safeUser.updated_at = user.updated_at;
    }

    return safeUser;
  }
}

export const authService = new AuthService();

// Authentication TypeScript Definitions (AUTH-02, AUTH-03)

/**
 * Safe public user representation without sensitive fields (e.g. password_hash)
 */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  created_at?: Date;
  updated_at?: Date;
}

/**
 * Internal database user representation including the hashed password
 */
export interface UserWithPassword extends AuthUser {
  password_hash: string;
}

/**
 * Payload encoded inside the JSON Web Token.
 * Contains strictly the minimum required user identity.
 */
export interface JwtPayload {
  userId: string;
}

/**
 * Standard authentication response returned upon successful register or login
 */
export interface AuthResponse {
  user: AuthUser;
  token: string;
}

/**
 * Response returned by GET /api/auth/me
 */
export interface CurrentUserResponse {
  user: AuthUser;
}

/**
 * Validated request body for user registration
 */
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

/**
 * Validated request body for user login
 */
export interface LoginRequest {
  email: string;
  password: string;
}

// Authentication TypeScript Definitions (AUTH-02)

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

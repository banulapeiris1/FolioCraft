// Portfolio TypeScript Definitions (PORTFOLIO-02)

/**
 * Social links record mapping platform identifiers to URLs.
 * Stored as JSONB in PostgreSQL.
 */
export type SocialLinks = Record<string, string>;

/**
 * Clean, camelCased Portfolio entity representation used by application layers.
 */
export interface Portfolio {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  title: string;
  about: string | null;
  profileImageUrl: string | null;
  socialLinks: SocialLinks;
  username: string;
  template: string;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Data payload required/optional when creating a new portfolio.
 */
export interface CreatePortfolioDto {
  name: string;
  title: string;
  username: string;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  about?: string | null;
  profileImageUrl?: string | null;
  socialLinks?: SocialLinks;
  template?: string;
  published?: boolean;
}

/**
 * Data payload for updating an existing portfolio (all fields optional).
 */
export interface UpdatePortfolioDto {
  name?: string;
  title?: string;
  username?: string;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  about?: string | null;
  profileImageUrl?: string | null;
  socialLinks?: SocialLinks;
  template?: string;
  published?: boolean;
}

/**
 * Result returned upon successful deletion of a portfolio.
 */
export interface DeletePortfolioResult {
  success: boolean;
  id: string;
}

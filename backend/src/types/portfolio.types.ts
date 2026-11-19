// Portfolio TypeScript Definitions (PORTFOLIO-02)

import type { Project } from "./project.types";
import type { Skill } from "./skill.types";
import type { Experience } from "./experience.types";

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
  publishedAt: Date | null;
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
}

/**
 * Result returned upon successful deletion of a portfolio.
 */
export interface DeletePortfolioResult {
  success: boolean;
  id: string;
}

/**
 * Sanitized public portfolio presentation model (PUB-02).
 * Excludes userId, passwordHash, and internal system metadata.
 * Directly compatible with frontend PortfolioViewData.
 */
export interface PublicPortfolioDto {
  name: string;
  title: string;
  about: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  profileImageUrl: string | null;
  socialLinks: SocialLinks;
  username: string;
  template: string;
  published: boolean;
  publishedAt: Date | string | null;
  projects: Project[];
  skills: Skill[];
  experiences: Experience[];
}

/**
 * Standard API response wrapper for public portfolio retrieval.
 */
export interface PublicPortfolioResponse {
  success: boolean;
  portfolio: PublicPortfolioDto;
}

/**
 * Username availability check result payload (PUB-03).
 */
export interface CheckUsernameResult {
  available: boolean;
  username: string;
}

export interface CheckUsernameResponse {
  success: boolean;
  available: boolean;
  username: string;
}

/**
 * Result payload returned upon publishing a portfolio (PUB-03).
 */
export interface PublishPortfolioResult {
  id: string;
  username: string;
  published: boolean;
  publishedAt: Date | string;
  publicUrl: string;
}

export interface PublishPortfolioResponse {
  success: boolean;
  message: string;
  portfolio: PublishPortfolioResult;
}

/**
 * Result payload returned upon unpublishing a portfolio (PUB-03).
 */
export interface UnpublishPortfolioResult {
  id: string;
  username: string;
  published: boolean;
  publicUrl: null;
}

export interface UnpublishPortfolioResponse {
  success: boolean;
  message: string;
  portfolio: UnpublishPortfolioResult;
}

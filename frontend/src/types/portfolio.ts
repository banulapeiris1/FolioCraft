// Frontend Portfolio Types (PORTFOLIO-06 & PORTFOLIO-07)

export type SocialLinks = Record<string, string>;

/**
 * Data payload managed by the portfolio form.
 * Matches backend DTOs while strictly omitting server-controlled fields like userId.
 */
export interface PortfolioFormData {
  name: string;
  title: string;
  about?: string;
  email?: string;
  phone?: string;
  location?: string;
  profileImageUrl?: string;
  socialLinks?: SocialLinks;
  username: string;
  template?: string;
}

/**
 * Full portfolio entity model returned from the backend.
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
  createdAt: string;
  updatedAt: string;
}

/**
 * API response format for single portfolio endpoints.
 */
export interface PortfolioResponse {
  portfolio: Portfolio;
}

/**
 * API response format for portfolio collection endpoints.
 */
export interface PortfoliosResponse {
  portfolios: Portfolio[];
}

/**
 * Client-side validation errors mapped to field names.
 */
export interface PortfolioFormErrors {
  name?: string;
  title?: string;
  username?: string;
  email?: string;
  phone?: string;
  location?: string;
  about?: string;
  profileImageUrl?: string;
  socialLinks?: Record<string, string>;
  template?: string;
  general?: string;
}

/**
 * Supported portfolio template themes.
 */
export type PortfolioTemplateId = "modern" | "minimal" | "professional";

export interface TemplateOption {
  id: PortfolioTemplateId;
  name: string;
  description: string;
  badge?: string;
}

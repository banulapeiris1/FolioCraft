// Frontend Portfolio Types (PORTFOLIO-06)

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

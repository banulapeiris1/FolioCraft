// Frontend Portfolio Types (PORTFOLIO-06 & PORTFOLIO-07)

import type { AnimationStyle } from "../templates/motion/motionConfig";

/**
 * Persisted, user-selectable animation style (Phase 14): subtle | creative | minimal.
 * The gallery-only "none" mode is a MotionMode, never an AnimationStyle.
 */
export type { AnimationStyle };

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
  /** Phase 14 presentation setting; omitted values are treated as "subtle". */
  animationStyle?: AnimationStyle;
}

/**
 * Read-only content counts returned by GET /api/portfolios (DASH-03).
 */
export interface PortfolioSectionCounts {
  projects: number;
  skills: number;
  experience: number;
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
  /** Phase 14. Optional so responses from an older backend still type-check. */
  animationStyle?: AnimationStyle;
  published: boolean;
  publishedAt?: string | null;
  publicUrl?: string | null;
  /** Present only on items from the list endpoint (DASH-03). */
  sectionCounts?: PortfolioSectionCounts;
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
  success?: boolean;
  portfolios: Portfolio[];
}

/**
 * API response format for username availability check (PUB-03 / PUB-05).
 */
export interface CheckUsernameResponse {
  success: boolean;
  available: boolean;
  username: string;
  message?: string;
}

/**
 * API response format for portfolio publishing (PUB-03 / PUB-05).
 */
export interface PublishPortfolioResponse {
  success: boolean;
  message: string;
  portfolio: Portfolio;
}

/**
 * API response format for portfolio unpublishing (PUB-03 / PUB-05).
 */
export interface UnpublishPortfolioResponse {
  success: boolean;
  message: string;
  portfolio: Portfolio;
}

/**
 * API response format for portfolio deletion (DASH-05).
 */
export interface DeletePortfolioResponse {
  success: boolean;
  id: string;
}

import type { PortfolioViewData } from "../templates/types";

/**
 * API response format for public portfolio retrieval (PUB-02 / PUB-04).
 */
export interface PublicPortfolioResponse {
  success: boolean;
  portfolio: PortfolioViewData;
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
 * Supported portfolio template themes (original three + Phase 13 collection).
 * Must stay in sync with SUPPORTED_TEMPLATES in backend/src/utils/validation.ts.
 */
export type PortfolioTemplateId =
  | "modern"
  | "minimal"
  | "professional"
  | "editorial"
  | "bento"
  | "studio"
  | "executive"
  | "showcase"
  | "academic";

export interface TemplateOption {
  id: PortfolioTemplateId;
  name: string;
  description: string;
  badge?: string;
}

import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicPortfolio, ApiError } from "@/lib/api";
import { PortfolioViewData } from "@/templates/types";
import { TemplateRenderer } from "@/templates/TemplateRenderer";
import {
  InvalidUsername,
  ServiceUnavailable,
} from "@/components/portfolio/PublicPortfolioStatus";

export interface PublicPortfolioPageProps {
  params: Promise<{
    username: string;
  }>;
}

const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

function isValidUsernameFormat(username: string): boolean {
  if (!username) return false;
  const trimmed = username.trim();
  return (
    trimmed.length >= 3 &&
    trimmed.length <= 50 &&
    USERNAME_PATTERN.test(trimmed)
  );
}

/**
 * Dynamic SEO and Open Graph metadata generation for public developer portfolios (PUB-04).
 */
export async function generateMetadata({
  params,
}: PublicPortfolioPageProps): Promise<Metadata> {
  const { username } = await params;
  const rawUsername = (username || "").trim();
  const normalized = rawUsername.toLowerCase();

  if (!isValidUsernameFormat(rawUsername)) {
    return {
      title: "Portfolio Not Found | FolioCraft",
      description: "The requested developer portfolio could not be found or is not published.",
    };
  }

  let res;
  try {
    res = await getPublicPortfolio(normalized, {
      cache: "no-store",
    });
  } catch (err) {
    // PUB-06: Unpublished / nonexistent portfolios must produce a real 404
    // (with Next.js' automatic robots noindex) instead of an indexable 200.
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    return {
      title: "Portfolio Not Found | FolioCraft",
      description: "The requested developer portfolio could not be found or is not published.",
    };
  }

  try {
    const portfolio = res.portfolio;
    const title = `${portfolio.name} — ${portfolio.title} | FolioCraft`;
    const description =
      portfolio.about?.trim() ||
      `${portfolio.name}'s professional developer portfolio. View featured projects, technical skills, and career experience.`;

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");
    const canonical = appUrl ? `${appUrl}/u/${normalized}` : `/u/${normalized}`;

    return {
      title,
      description,
      alternates: {
        canonical,
      },
      openGraph: {
        title: `${portfolio.name} — ${portfolio.title}`,
        description,
        url: canonical,
        siteName: "FolioCraft",
        type: "profile",
        images: portfolio.profileImageUrl
          ? [
              {
                url: portfolio.profileImageUrl,
                alt: `${portfolio.name}'s profile photo`,
              },
            ]
          : undefined,
      },
      twitter: {
        card: portfolio.profileImageUrl ? "summary_large_image" : "summary",
        title: `${portfolio.name} — ${portfolio.title}`,
        description,
        images: portfolio.profileImageUrl ? [portfolio.profileImageUrl] : undefined,
      },
    };
  } catch {
    return {
      title: "Portfolio Not Found | FolioCraft",
      description: "The requested developer portfolio could not be found or is not published.",
    };
  }
}

/**
 * Public Developer Portfolio Page Route (/u/:username) (PUB-04).
 *
 * Responsibilities:
 * - Publicly accessible without authentication.
 * - Dynamic parameter handling with case-insensitive normalization.
 * - Direct integration with backend public portfolio retrieval API (GET /api/public/:username).
 * - Multi-template rendering via TemplateRenderer (Modern, Minimal, Professional).
 * - Full error state handling (404 Not Found, 400 Invalid Username, 500/Connection Error).
 * - Zero exposure of private user data or database IDs.
 */
export default async function PublicPortfolioPage({
  params,
}: PublicPortfolioPageProps): Promise<React.JSX.Element> {
  const { username } = await params;
  const rawUsername = (username || "").trim();

  // 1. Guard invalid username formats prior to API query
  if (!isValidUsernameFormat(rawUsername)) {
    return <InvalidUsername username={rawUsername} />;
  }

  const normalizedUsername = rawUsername.toLowerCase();

  let portfolio: PortfolioViewData | null = null;
  let errorStatus: number | null = null;

  try {
    const response = await getPublicPortfolio(normalizedUsername, {
      cache: "no-store",
    });
    portfolio = response.portfolio;
  } catch (err) {
    if (err instanceof ApiError) {
      errorStatus = err.status;
    } else {
      errorStatus = 500;
    }
  }

  // 2. Error State Handling
  if (errorStatus === 400) {
    return <InvalidUsername username={rawUsername} />;
  }

  if (errorStatus !== null && (errorStatus >= 500 || errorStatus === 0)) {
    return <ServiceUnavailable />;
  }

  if (errorStatus === 404 || !portfolio) {
    // PUB-06: Delegate to the route's not-found.tsx boundary so Next.js
    // sends a 404 status / robots noindex. Identical for unpublished and
    // nonexistent usernames (no draft enumeration).
    notFound();
  }

  // 3. Normalize presentation view model safely
  const viewData: PortfolioViewData = {
    name: portfolio.name || "",
    title: portfolio.title || "",
    about: portfolio.about || null,
    email: portfolio.email || null,
    phone: portfolio.phone || null,
    location: portfolio.location || null,
    profileImageUrl: portfolio.profileImageUrl || null,
    socialLinks: portfolio.socialLinks ? { ...portfolio.socialLinks } : {},
    username: portfolio.username || normalizedUsername,
    projects: Array.isArray(portfolio.projects) ? portfolio.projects : [],
    skills: Array.isArray(portfolio.skills) ? portfolio.skills : [],
    experiences: Array.isArray(portfolio.experiences) ? portfolio.experiences : [],
    template: portfolio.template || "modern",
  };

  // 4. Render the active template through TemplateRenderer
  return (
    <main data-testid="public-portfolio-container" className="min-h-screen w-full">
      <TemplateRenderer templateId={viewData.template} data={viewData} />
    </main>
  );
}

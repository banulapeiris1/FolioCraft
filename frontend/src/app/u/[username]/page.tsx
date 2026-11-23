import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TemplateRenderer } from "@/templates/TemplateRenderer";
import { SiteNav } from "@/templates/site/SiteNav";
import { createProjectHrefResolver } from "@/templates/site/siteModel";
import { motionScopeProps } from "@/templates/motion/MotionRoot";
import {
  InvalidUsername,
  ServiceUnavailable,
} from "@/components/portfolio/PublicPortfolioStatus";
import {
  loadPublicPortfolio,
  canonicalUrl,
  PORTFOLIO_NOT_FOUND_METADATA,
} from "@/lib/publicPortfolio";

export interface PublicPortfolioPageProps {
  params: Promise<{
    username: string;
  }>;
}

/**
 * Dynamic SEO and Open Graph metadata generation for public developer portfolios (PUB-04).
 */
export async function generateMetadata({
  params,
}: PublicPortfolioPageProps): Promise<Metadata> {
  const { username } = await params;
  const result = await loadPublicPortfolio(username);

  // PUB-06: Unpublished / nonexistent portfolios must produce a real 404
  // (with Next.js' automatic robots noindex) instead of an indexable 200.
  if (result.status === "not-found") notFound();
  if (result.status !== "ok") return { ...PORTFOLIO_NOT_FOUND_METADATA };

  const portfolio = result.data;
  const title = `${portfolio.name} — ${portfolio.title} | FolioCraft`;
  const description =
    portfolio.about?.trim() ||
    `${portfolio.name}'s professional developer portfolio. View featured projects, technical skills, and career experience.`;
  const canonical = canonicalUrl(`/u/${result.username}`);

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
}

/**
 * Public Developer Portfolio Home Route (/u/:username) (PUB-04, Phase 12).
 *
 * - Publicly accessible without authentication.
 * - Renders the owner's full single-page template (unchanged experience).
 * - Unpublished and nonexistent portfolios both produce the same 404.
 * - Zero exposure of private user data.
 */
export default async function PublicPortfolioPage({
  params,
}: PublicPortfolioPageProps): Promise<React.JSX.Element> {
  const { username } = await params;
  const result = await loadPublicPortfolio(username);

  if (result.status === "invalid") return <InvalidUsername username={result.username} />;
  if (result.status === "unavailable") return <ServiceUnavailable />;
  if (result.status === "not-found") notFound();

  const viewData = result.data;

  // Phase 12: the full single-page template stays the home page; site
  // navigation replaces its in-page anchors and project cards link to detail pages.
  return (
    // Phase 14: <main> is the motion scope; its only child stays the TemplateRenderer.
    <main
      data-testid="public-portfolio-container"
      className="min-h-screen w-full"
      {...motionScopeProps(viewData, viewData.template)}
    >
      <TemplateRenderer
        templateId={viewData.template}
        data={viewData}
        siteNav={<SiteNav data={viewData} username={result.username} current="home" />}
        getProjectHref={createProjectHrefResolver(result.username, viewData.projects)}
      />
    </main>
  );
}

import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  InvalidUsername,
  ServiceUnavailable,
} from "@/components/portfolio/PublicPortfolioStatus";
import {
  loadPublicPortfolio,
  canonicalUrl,
  PORTFOLIO_NOT_FOUND_METADATA,
} from "@/lib/publicPortfolio";
import { PortfolioSiteShell } from "@/templates/site/PortfolioSiteShell";
import { ExperienceView } from "@/templates/site/ExperienceView";
import { portfolioPaths } from "@/templates/site/siteModel";

export interface PublicExperiencePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PublicExperiencePageProps): Promise<Metadata> {
  const { username } = await params;
  const result = await loadPublicPortfolio(username);
  // Resolve 404s here (before streaming) so unpublished portfolios get a real 404 status.
  if (result.status === "not-found") notFound();
  if (result.status !== "ok") return { ...PORTFOLIO_NOT_FOUND_METADATA };

  const { data } = result;
  const title = `Experience — ${data.name} | FolioCraft`;
  const description = `Work experience and career history of ${data.name}${
    data.title ? `, ${data.title}` : ""
  }.`;
  const canonical = canonicalUrl(portfolioPaths(result.username).experience);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, siteName: "FolioCraft", type: "profile" },
  };
}

/** Public Experience page (/u/:username/experience) — Phase 12. */
export default async function PublicExperiencePage({
  params,
}: PublicExperiencePageProps): Promise<React.JSX.Element> {
  const { username } = await params;
  const result = await loadPublicPortfolio(username);

  if (result.status === "invalid") return <InvalidUsername username={result.username} />;
  if (result.status === "unavailable") return <ServiceUnavailable />;
  if (result.status === "not-found") notFound();

  return (
    <PortfolioSiteShell data={result.data} username={result.username} current="experience">
      <ExperienceView data={result.data} username={result.username} />
    </PortfolioSiteShell>
  );
}

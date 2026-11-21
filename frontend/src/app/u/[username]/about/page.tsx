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
import { AboutView } from "@/templates/site/AboutView";
import { portfolioPaths } from "@/templates/site/siteModel";

export interface PublicAboutPageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PublicAboutPageProps): Promise<Metadata> {
  const { username } = await params;
  const result = await loadPublicPortfolio(username);
  // Resolve 404s here (before streaming) so unpublished portfolios get a real 404 status.
  if (result.status === "not-found") notFound();
  if (result.status !== "ok") return { ...PORTFOLIO_NOT_FOUND_METADATA };

  const { data } = result;
  const title = `About ${data.name} | FolioCraft`;
  const description =
    data.about?.replace(/\s+/g, " ").trim().slice(0, 160) ||
    `About ${data.name}${data.title ? `, ${data.title}` : ""}.`;
  const canonical = canonicalUrl(portfolioPaths(result.username).about);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "FolioCraft",
      type: "profile",
      images: data.profileImageUrl
        ? [{ url: data.profileImageUrl, alt: `${data.name}'s profile photo` }]
        : undefined,
    },
  };
}

/** Public About page (/u/:username/about) — Phase 12. */
export default async function PublicAboutPage({
  params,
}: PublicAboutPageProps): Promise<React.JSX.Element> {
  const { username } = await params;
  const result = await loadPublicPortfolio(username);

  if (result.status === "invalid") return <InvalidUsername username={result.username} />;
  if (result.status === "unavailable") return <ServiceUnavailable />;
  if (result.status === "not-found") notFound();

  return (
    <PortfolioSiteShell data={result.data} username={result.username} current="about">
      <AboutView data={result.data} username={result.username} />
    </PortfolioSiteShell>
  );
}

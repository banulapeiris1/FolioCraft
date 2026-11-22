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
import { ProjectDetailView } from "@/templates/site/ProjectDetailView";
import {
  buildProjectEntries,
  findProjectBySlug,
  portfolioPaths,
} from "@/templates/site/siteModel";

export interface PublicProjectPageProps {
  params: Promise<{ username: string; projectSlug: string }>;
}

const MAX_DESCRIPTION_LENGTH = 160;

function summarize(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > MAX_DESCRIPTION_LENGTH
    ? `${flat.slice(0, MAX_DESCRIPTION_LENGTH - 1).trimEnd()}…`
    : flat;
}

export async function generateMetadata({ params }: PublicProjectPageProps): Promise<Metadata> {
  const { username, projectSlug } = await params;
  const result = await loadPublicPortfolio(username);
  // Resolve 404s here (before streaming) so unknown projects and unpublished
  // portfolios get a real 404 status with robots noindex.
  if (result.status === "not-found") notFound();
  if (result.status !== "ok") return { ...PORTFOLIO_NOT_FOUND_METADATA };

  const location = findProjectBySlug(buildProjectEntries(result.data.projects), projectSlug);
  if (!location) notFound();

  const { project, slug } = location.entry;
  const { data } = result;
  const title = `${project.title} — ${data.name} | FolioCraft`;
  const description = project.description
    ? summarize(project.description)
    : `${project.title}, a project by ${data.name}.`;
  const canonical = canonicalUrl(portfolioPaths(result.username).project(slug));

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "FolioCraft",
      type: "article",
      images: project.imageUrl ? [{ url: project.imageUrl, alt: project.title }] : undefined,
    },
    twitter: {
      card: project.imageUrl ? "summary_large_image" : "summary",
      title,
      description,
      images: project.imageUrl ? [project.imageUrl] : undefined,
    },
  };
}

/** Public project detail (/u/:username/projects/:projectSlug) — Phase 12. */
export default async function PublicProjectPage({
  params,
}: PublicProjectPageProps): Promise<React.JSX.Element> {
  const { username, projectSlug } = await params;
  const result = await loadPublicPortfolio(username);

  if (result.status === "invalid") return <InvalidUsername username={result.username} />;
  if (result.status === "unavailable") return <ServiceUnavailable />;
  if (result.status === "not-found") notFound();

  const location = findProjectBySlug(buildProjectEntries(result.data.projects), projectSlug);
  if (!location) notFound();

  return (
    <PortfolioSiteShell data={result.data} username={result.username} current="projects">
      <ProjectDetailView data={result.data} username={result.username} location={location} />
    </PortfolioSiteShell>
  );
}

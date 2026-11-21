"use client";

import React from "react";
import { useParams } from "next/navigation";
import { ProjectNotFound } from "@/components/portfolio/PublicPortfolioStatus";
import { isValidUsernameFormat } from "@/lib/publicPortfolio";
import { portfolioPaths } from "@/templates/site/siteModel";

/**
 * Project Not Found boundary (Phase 12).
 * Rendered when notFound() is called for an unknown project slug (or a
 * missing/unpublished portfolio) under /u/:username/projects/:projectSlug.
 * not-found files receive no props, so the username is read from the URL.
 */
export default function PublicProjectNotFound(): React.JSX.Element {
  const params = useParams<{ username?: string }>();
  const username = typeof params?.username === "string" ? params.username.trim().toLowerCase() : "";
  const projectsHref = isValidUsernameFormat(username) ? portfolioPaths(username).projects : undefined;

  return <ProjectNotFound projectsHref={projectsHref} />;
}

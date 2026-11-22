import React from "react";
import Link from "next/link";
import type { PortfolioViewData } from "../types";
import { portfolioPaths, safeExternalUrl, type ProjectEntry, type ProjectLocation } from "./siteModel";
import { getSiteTheme, type SiteTheme } from "./siteThemes";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ExternalLinkIcon,
  GithubIcon,
} from "@/components/portfolio/PortfolioIcons";

interface AdjacentLinkProps {
  entry: ProjectEntry | null;
  direction: "previous" | "next";
  href: (slug: string) => string;
  theme: SiteTheme;
}

/**
 * One side of the previous/next control. At the first/last project the side
 * renders an empty placeholder so the remaining link keeps its position.
 */
function AdjacentLink({ entry, direction, href, theme }: AdjacentLinkProps): React.JSX.Element {
  const isNext = direction === "next";
  if (!entry) {
    return <div aria-hidden="true" className="hidden sm:block" />;
  }
  return (
    <Link
      href={href(entry.slug)}
      rel={isNext ? "next" : "prev"}
      data-testid={`project-${direction}`}
      className={`${theme.cardInteractive} ${theme.focusRing} p-4 sm:p-5 flex flex-col gap-1 min-w-0 ${
        isNext ? "sm:items-end sm:text-right sm:col-start-2" : ""
      }`}
    >
      <span className={`${theme.muted} inline-flex items-center gap-1.5`}>
        {!isNext && <ArrowLeftIcon className="w-3.5 h-3.5" />}
        {isNext ? "Next project" : "Previous project"}
        {isNext && <ArrowRightIcon className="w-3.5 h-3.5" />}
      </span>
      <span className={`${theme.cardTitle} truncate max-w-full`}>{entry.project.title}</span>
    </Link>
  );
}

export interface ProjectDetailViewProps {
  data: PortfolioViewData;
  username: string;
  location: ProjectLocation;
}

/** Individual project page content with previous/next navigation (Phase 12). */
export function ProjectDetailView({ data, username, location }: ProjectDetailViewProps): React.JSX.Element {
  const theme = getSiteTheme(data.template);
  const paths = portfolioPaths(username);
  const { project, index } = location.entry;
  const githubUrl = safeExternalUrl(project.githubUrl);
  const liveUrl = safeExternalUrl(project.projectUrl);

  return (
    <article data-testid="project-detail" aria-labelledby="project-title" className="min-w-0">
      <Link
        href={paths.projects}
        className={`inline-flex items-center gap-1.5 mb-8 ${theme.textLink} ${theme.focusRing}`}
      >
        <ArrowLeftIcon className="w-4 h-4" />
        All projects
      </Link>

      <header className="space-y-4 mb-8 sm:mb-10">
        <p className={theme.eyebrow}>
          Project {index + 1} of {location.total}
        </p>
        <h1 id="project-title" className={theme.pageTitle}>
          {project.title}
        </h1>

        {(githubUrl || liveUrl) && (
          <div className="flex flex-wrap gap-3 pt-2" data-testid="project-links">
            {liveUrl && (
              <a
                href={liveUrl}
                target="_blank"
                rel="noreferrer noopener"
                className={`${theme.primaryButton} ${theme.focusRing}`}
              >
                <ExternalLinkIcon className="w-4 h-4" />
                Live demo
                <span className="sr-only">(opens in new tab)</span>
              </a>
            )}
            {githubUrl && (
              <a
                href={githubUrl}
                target="_blank"
                rel="noreferrer noopener"
                className={`${theme.secondaryButton} ${theme.focusRing}`}
              >
                <GithubIcon className="w-4 h-4" />
                Source code
                <span className="sr-only">(opens in new tab)</span>
              </a>
            )}
          </div>
        )}
      </header>

      {project.imageUrl && (
        <figure className={`mb-10 sm:mb-12 ${theme.media}`}>
          <img
            src={project.imageUrl}
            alt={`Screenshot of ${project.title}`}
            className="w-full h-full object-cover"
          />
        </figure>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12">
        <section aria-labelledby="project-overview" className={theme.mainColumn}>
          <h2 id="project-overview" className={`${theme.sectionTitle} mb-4`}>
            Overview
          </h2>
          {project.description ? (
            <p className={`${theme.body} whitespace-pre-line break-words`}>{project.description}</p>
          ) : (
            <p className={`${theme.muted} italic`}>No description provided for this project.</p>
          )}
        </section>

        <section aria-labelledby="project-technologies" className={theme.sideColumn}>
          <h2 id="project-technologies" className={`${theme.sectionTitle} mb-4`}>
            Technologies
          </h2>
          {project.technologies.length > 0 ? (
            <ul className="flex flex-wrap gap-2" data-testid="project-technologies">
              {project.technologies.map((tech, techIndex) => (
                <li key={`${tech}-${techIndex}`} className={theme.chip}>
                  {tech}
                </li>
              ))}
            </ul>
          ) : (
            <p className={`${theme.muted} italic`}>No technologies listed.</p>
          )}
        </section>
      </div>

      {(location.previous || location.next) && (
        <nav
          aria-label="Project navigation"
          data-testid="project-pagination"
          className={`mt-14 sm:mt-16 pt-8 border-t ${theme.divider} grid grid-cols-1 sm:grid-cols-2 gap-4`}
        >
          <AdjacentLink entry={location.previous} direction="previous" href={paths.project} theme={theme} />
          <AdjacentLink entry={location.next} direction="next" href={paths.project} theme={theme} />
        </nav>
      )}
    </article>
  );
}

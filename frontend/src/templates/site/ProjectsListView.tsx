import React from "react";
import Link from "next/link";
import type { PortfolioViewData } from "../types";
import { buildProjectEntries, portfolioPaths, type ProjectEntry } from "./siteModel";
import { getSiteTheme, type SiteTheme } from "./siteThemes";
import { EmptyState, PageHeader } from "./SitePrimitives";
import { ArrowRightIcon } from "@/components/portfolio/PortfolioIcons";

const MAX_CARD_TECHNOLOGIES = 5;

interface ProjectCardProps {
  entry: ProjectEntry;
  href: string;
  theme: SiteTheme;
}

/**
 * Project summary card for the listing page. The title and "View project"
 * link both go to the detail page; external GitHub / demo links live on the
 * detail page so the card never contains nested or competing links.
 */
function ProjectCard({ entry, href, theme }: ProjectCardProps): React.JSX.Element {
  const { project } = entry;
  const technologies = project.technologies.slice(0, MAX_CARD_TECHNOLOGIES);
  const hiddenCount = project.technologies.length - technologies.length;
  const headingId = `project-card-${entry.slug}`;

  return (
    <article
      aria-labelledby={headingId}
      data-testid="project-card"
      className={`${theme.cardInteractive} p-5 sm:p-6 flex flex-col h-full min-w-0`}
    >
      {project.imageUrl && (
        <Link href={href} tabIndex={-1} aria-hidden="true" className={`block mb-4 ${theme.media}`}>
          <img
            src={project.imageUrl}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
          />
        </Link>
      )}

      <h2 id={headingId} className={`${theme.cardTitle} mb-2`}>
        <Link href={href} className={`hover:underline underline-offset-4 ${theme.focusRing}`}>
          {project.title}
        </Link>
      </h2>

      {project.description ? (
        <p className={`${theme.muted} leading-relaxed line-clamp-3 mb-4 break-words`}>
          {project.description}
        </p>
      ) : (
        <p className={`${theme.muted} italic mb-4`}>No description provided.</p>
      )}

      <div className="mt-auto space-y-4">
        {technologies.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label={`Technologies used in ${project.title}`}>
            {technologies.map((tech, index) => (
              <li key={`${tech}-${index}`} className={theme.chip}>
                {tech}
              </li>
            ))}
            {hiddenCount > 0 && <li className={theme.chip}>+{hiddenCount}</li>}
          </ul>
        )}

        <Link
          href={href}
          className={`inline-flex items-center gap-1.5 ${theme.textLink} ${theme.focusRing}`}
          aria-label={`View project: ${project.title}`}
        >
          View project
          <ArrowRightIcon className="w-4 h-4" />
        </Link>
      </div>
    </article>
  );
}

export interface ProjectsListViewProps {
  data: PortfolioViewData;
  username: string;
}

/** Dedicated Projects page content (Phase 12). */
export function ProjectsListView({ data, username }: ProjectsListViewProps): React.JSX.Element {
  const theme = getSiteTheme(data.template);
  const paths = portfolioPaths(username);
  const entries = buildProjectEntries(data.projects);
  const owner = data.name || "This developer";

  return (
    <div data-testid="projects-page">
      <PageHeader
        theme={theme}
        eyebrow="Portfolio"
        title="Projects"
        subtitle={
          entries.length > 0
            ? `${entries.length} ${entries.length === 1 ? "project" : "projects"} by ${owner}.`
            : undefined
        }
      />

      {entries.length === 0 ? (
        <EmptyState
          theme={theme}
          testId="projects-empty"
          title="No projects yet"
          message={`${owner} hasn't published any projects. Check back soon.`}
          action={{ href: paths.home, label: "Back to portfolio" }}
        />
      ) : (
        <div
          className={`grid grid-cols-1 gap-6 ${theme.id === "minimal" ? "" : "md:grid-cols-2"}`}
          data-testid="projects-grid"
        >
          {entries.map((entry) => (
            <ProjectCard key={entry.project.id} entry={entry} href={paths.project(entry.slug)} theme={theme} />
          ))}
        </div>
      )}
    </div>
  );
}

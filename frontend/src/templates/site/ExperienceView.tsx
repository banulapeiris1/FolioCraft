import React from "react";
import type { PortfolioViewData } from "../types";
import { formatDateRange, portfolioPaths, sortExperiences } from "./siteModel";
import { getSiteTheme } from "./siteThemes";
import { EmptyState, PageHeader } from "./SitePrimitives";
import { getTemplateMotion } from "../motion/motionConfig";

export interface ExperienceViewProps {
  data: PortfolioViewData;
  username: string;
}

/**
 * Experience page content (Phase 12): full work-history timeline from the
 * existing experience records. Education is intentionally not rendered — the
 * current database and API do not store education records.
 */
export function ExperienceView({ data, username }: ExperienceViewProps): React.JSX.Element {
  const theme = getSiteTheme(data.template);
  const motion = getTemplateMotion(theme.id);
  const experiences = sortExperiences(data.experiences);
  const name = data.name || "This developer";
  const count = experiences.length;

  return (
    <div data-testid="experience-page">
      <PageHeader
        theme={theme}
        eyebrow="Career"
        title="Experience"
        subtitle={count > 0 ? `${count} ${count === 1 ? "role" : "roles"} across ${name}'s career.` : undefined}
      />

      {count === 0 ? (
        <EmptyState
          theme={theme}
          testId="experience-empty"
          title="No experience listed yet"
          message={`${name} hasn't added any work experience.`}
          action={{ href: portfolioPaths(username).home, label: "Back to portfolio" }}
        />
      ) : (
        <ol className={`relative ${theme.timeline} ml-2 sm:ml-3 pl-6 sm:pl-8 space-y-10`} data-testid="experience-timeline" {...motion.section()}>
          {experiences.map((exp) => {
            const dates = formatDateRange(exp.startDate, exp.endDate, exp.isCurrent);
            return (
              <li key={exp.id} className="relative min-w-0" data-testid="experience-item" {...motion.item()}>
                <span
                  aria-hidden="true"
                  className={`absolute -left-[31px] sm:-left-[39px] top-1.5 w-3 h-3 rounded-full ${theme.timelineDot}`}
                />
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 mb-1">
                  <h2 className={theme.cardTitle}>{exp.position || exp.company}</h2>
                  {(dates || exp.isCurrent) && (
                    <p className={`${theme.muted} flex items-center gap-2 flex-shrink-0`}>
                      {dates && <span>{dates}</span>}
                      {exp.isCurrent && <span className={theme.badge}>Current</span>}
                    </p>
                  )}
                </div>
                {exp.position && exp.company && (
                  <p className={`text-sm font-semibold ${theme.accentText} mb-3 break-words`}>{exp.company}</p>
                )}
                {exp.description && (
                  <p className={`${theme.body} whitespace-pre-line break-words max-w-prose`}>{exp.description}</p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

import React from "react";
import { TemplateProps } from "../types";
import {
  MapPinIcon,
  MailIcon,
  PhoneIcon,
  GithubIcon,
  GlobeIcon,
  ExternalLinkIcon,
} from "@/components/portfolio/PortfolioIcons";

/**
 * Minimal social media icon helpers for LinkedIn and Twitter/X
 */
function LinkedinIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9h2.8v8.37h-2.8v-8.37M7.86 6.3a1.63 1.63 0 1 0 0 3.26 1.63 1.63 0 0 0 0-3.26Z" />
    </svg>
  );
}

function TwitterIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function getSocialIcon(key: string) {
  const normalized = key.toLowerCase();
  if (normalized.includes("github")) return <GithubIcon className="w-4 h-4" />;
  if (normalized.includes("linkedin")) return <LinkedinIcon className="w-4 h-4" />;
  if (normalized.includes("twitter") || normalized === "x") return <TwitterIcon className="w-4 h-4" />;
  if (
    normalized.includes("globe") ||
    normalized.includes("web") ||
    normalized.includes("site") ||
    normalized.includes("portfolio")
  ) {
    return <GlobeIcon className="w-4 h-4" />;
  }
  return <ExternalLinkIcon className="w-4 h-4" />;
}

function sanitizeUrl(url?: string | null): string {
  if (!url) return "#";
  const trimmed = url.trim();
  if (
    /^https?:\/\//i.test(trimmed) ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:")
  ) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function formatDateRange(
  startDate?: string | null,
  endDate?: string | null,
  isCurrent?: boolean
): string {
  if (!startDate) return "";

  const format = (dateStr: string) => {
    const parts = dateStr.split("-");
    if (parts.length >= 2) {
      const year = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${months[monthIndex]} ${year}`;
      }
      return `${parts[1]}/${year}`;
    }
    return dateStr;
  };

  const startFormatted = format(startDate);
  if (isCurrent) {
    return `${startFormatted} — Present`;
  }
  if (endDate) {
    return `${startFormatted} — ${format(endDate)}`;
  }
  return startFormatted;
}

/**
 * TemplateMinimal — Clean, typography-driven, editorial portfolio template.
 *
 * Design Principles:
 * - Content-focused & uncluttered
 * - Generous whitespace and balanced typographic scale
 * - Dynamic rendering without placeholder cards or empty sections
 * - Pure presentation component (no external state or side effects)
 */
export function TemplateMinimal({ data, className = "" }: TemplateProps): React.JSX.Element {
  const currentYear = new Date().getFullYear();

  // Experiences: sort current first, then descending by startDate
  const validExperiences = Array.isArray(data.experiences) ? data.experiences : [];
  const sortedExperiences = [...validExperiences].sort((a, b) => {
    if (a.isCurrent && !b.isCurrent) return -1;
    if (!a.isCurrent && b.isCurrent) return 1;
    return (b.startDate || "").localeCompare(a.startDate || "");
  });

  // Projects: sort by orderIndex ascending
  const validProjects = Array.isArray(data.projects) ? data.projects : [];
  const sortedProjects = [...validProjects].sort(
    (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
  );

  // Skills: group by category while preserving orderIndex
  const validSkills = Array.isArray(data.skills) ? data.skills : [];
  const skillCategories: Record<string, typeof validSkills> = {};
  validSkills.forEach((skill) => {
    const cat = (skill.category || "").trim() || "Core Capabilities";
    if (!skillCategories[cat]) {
      skillCategories[cat] = [];
    }
    skillCategories[cat].push(skill);
  });
  Object.values(skillCategories).forEach((list) => {
    list.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  });
  const groupedSkills = Object.entries(skillCategories);

  // Social links entries
  const socialEntries = data.socialLinks
    ? Object.entries(data.socialLinks).filter(([_, url]) => Boolean(url && url.trim()))
    : [];

  return (
    <div
      data-testid="template-minimal"
      className={`template-minimal min-h-screen bg-white text-slate-900 font-sans selection:bg-slate-200 selection:text-slate-900 ${className}`}
    >
      <main className="max-w-3xl mx-auto px-6 py-12 sm:py-20 lg:py-24">
        {/* ========================================================= */}
        {/* 1. Header / Hero Section */}
        {/* ========================================================= */}
        <header className="border-b border-slate-100 pb-10 sm:pb-14 mb-12 sm:mb-16">
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-6 sm:gap-8">
            <div className="space-y-3 flex-1 min-w-0">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 break-words">
                {data.name || "Portfolio"}
              </h1>

              {data.title && (
                <p className="text-lg sm:text-xl font-medium text-slate-600 leading-snug break-words">
                  {data.title}
                </p>
              )}

              {data.location && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <MapPinIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="break-words">{data.location}</span>
                </div>
              )}
            </div>

            {/* Profile Image (only rendered if provided) */}
            {data.profileImageUrl && (
              <div className="flex-shrink-0">
                <img
                  src={data.profileImageUrl}
                  alt={data.name ? `${data.name}'s profile photo` : "Profile photo"}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border border-slate-200 shadow-xs"
                />
              </div>
            )}
          </div>

          {/* About / Summary */}
          {data.about && (
            <p className="mt-6 text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl whitespace-pre-line">
              {data.about}
            </p>
          )}

          {/* Contact & Social Links */}
          <address className="not-italic mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-y-2.5 gap-x-5 text-xs text-slate-500">
            {data.email && (
              <a
                href={`mailto:${data.email}`}
                className="inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors break-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 rounded-sm py-1"
              >
                <MailIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>{data.email}</span>
              </a>
            )}

            {data.phone && (
              <a
                href={`tel:${data.phone}`}
                className="inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 rounded-sm py-1"
              >
                <PhoneIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>{data.phone}</span>
              </a>
            )}

            {socialEntries.map(([platform, url]) => (
              <a
                key={platform}
                href={sanitizeUrl(url)}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 rounded-sm py-1"
                aria-label={`${platform} profile (opens in new tab)`}
              >
                <span className="text-slate-400">{getSocialIcon(platform)}</span>
                <span>{platform}</span>
              </a>
            ))}
          </address>
        </header>

        {/* ========================================================= */}
        {/* 2. Experience Section */}
        {/* ========================================================= */}
        {sortedExperiences.length > 0 && (
          <section aria-labelledby="section-experience-heading" className="mb-12 sm:mb-16">
            <h2
              id="section-experience-heading"
              className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-6 pb-2 border-b border-slate-100"
            >
              Experience
            </h2>

            <div className="space-y-8 sm:space-y-10">
              {sortedExperiences.map((exp) => (
                <article key={exp.id} className="relative group">
                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                    <h3 className="text-base font-semibold text-slate-900">{exp.position}</h3>
                    <span className="text-xs text-slate-500 font-mono">
                      {formatDateRange(exp.startDate, exp.endDate, exp.isCurrent)}
                    </span>
                  </div>

                  <div className="text-sm font-medium text-slate-700 mt-0.5">{exp.company}</div>

                  {exp.description && (
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                      {exp.description}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* 3. Projects Section */}
        {/* ========================================================= */}
        {sortedProjects.length > 0 && (
          <section aria-labelledby="section-projects-heading" className="mb-12 sm:mb-16">
            <h2
              id="section-projects-heading"
              className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-6 pb-2 border-b border-slate-100"
            >
              Projects
            </h2>

            <div className="space-y-8">
              {sortedProjects.map((project) => (
                <article
                  key={project.id}
                  className="p-5 sm:p-6 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    {project.imageUrl && (
                      <div className="mb-4 overflow-hidden rounded-lg aspect-video bg-slate-50 border border-slate-100">
                        <img
                          src={project.imageUrl}
                          alt={project.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-semibold text-slate-900 break-words">{project.title}</h3>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {project.githubUrl && (
                          <a
                            href={sanitizeUrl(project.githubUrl)}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-slate-400 hover:text-slate-900 transition-colors p-2 min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                            aria-label={`GitHub repository for ${project.title} (opens in new tab)`}
                          >
                            <GithubIcon className="w-4 h-4" />
                          </a>
                        )}
                        {project.projectUrl && (
                          <a
                            href={sanitizeUrl(project.projectUrl)}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-slate-400 hover:text-slate-900 transition-colors p-2 min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                            aria-label={`Live site for ${project.title} (opens in new tab)`}
                          >
                            <ExternalLinkIcon className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>

                    {project.description && (
                      <p className="mt-2 text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                        {project.description}
                      </p>
                    )}
                  </div>

                  {project.technologies && project.technologies.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                      {project.technologies.map((tech, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200/80 rounded"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* 4. Skills Section */}
        {/* ========================================================= */}
        {groupedSkills.length > 0 && (
          <section aria-labelledby="section-skills-heading" className="mb-12 sm:mb-16">
            <h2
              id="section-skills-heading"
              className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-6 pb-2 border-b border-slate-100"
            >
              Skills
            </h2>

            <div className="space-y-6">
              {groupedSkills.map(([category, skills]) => (
                <div key={category}>
                  {groupedSkills.length > 1 && (
                    <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2.5">
                      {category}
                    </h3>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <span
                        key={skill.id}
                        className="px-3 py-1 text-xs font-medium text-slate-800 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
                      >
                        {skill.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* 5. Minimal Footer */}
        {/* ========================================================= */}
        <footer className="pt-8 border-t border-slate-100 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © {currentYear} {data.name || "Portfolio"}. All rights reserved.
          </span>
          <span className="text-[11px] text-slate-400">Published with FolioCraft</span>
        </footer>
      </main>
    </div>
  );
}

export default TemplateMinimal;

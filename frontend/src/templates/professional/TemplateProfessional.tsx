import React from "react";
import { TemplateProps } from "../types";
import {
  MapPinIcon,
  MailIcon,
  PhoneIcon,
  GithubIcon,
  GlobeIcon,
  ExternalLinkIcon,
  BriefcaseIcon,
} from "@/components/portfolio/PortfolioIcons";

/**
 * Social media icons for LinkedIn and Twitter/X
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
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
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
 * TemplateProfessional — Classic Executive / Consultant portfolio template.
 *
 * Design Principles:
 * - Refined, structured corporate aesthetic with deep navy/slate accents
 * - Clean information hierarchy suitable for executives, senior engineers, and consultants
 * - Two-column structured sections and milestone cards
 * - Pure presentation component (no external state or side effects)
 */
export function TemplateProfessional({
  data,
  className = "",
}: TemplateProps): React.JSX.Element {
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
    const cat = (skill.category || "").trim() || "Core Competencies";
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

  // In-page navigation anchors
  const navSections: Array<{ label: string; href: string }> = [];
  if (data.about) navSections.push({ label: "Summary", href: "#summary" });
  if (sortedExperiences.length > 0) navSections.push({ label: "Experience", href: "#experience" });
  if (sortedProjects.length > 0) navSections.push({ label: "Projects", href: "#projects" });
  if (groupedSkills.length > 0) navSections.push({ label: "Competencies", href: "#skills" });
  if (data.email || data.phone || socialEntries.length > 0) {
    navSections.push({ label: "Contact", href: "#contact" });
  }

  return (
    <div
      data-testid="template-professional"
      className={`template-professional min-h-screen bg-slate-50/60 text-slate-800 font-sans selection:bg-blue-900/10 selection:text-blue-950 ${className}`}
    >
      {/* ========================================================= */}
      {/* 1. Executive Top Navigation Bar */}
      {/* ========================================================= */}
      <nav
        aria-label="Executive Portfolio Navigation"
        className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-6 py-3.5 shadow-2xs"
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <a
            href="#summary"
            className="flex items-center gap-2.5 font-bold text-slate-900 tracking-tight hover:text-blue-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2 rounded-sm"
          >
            <div className="w-7 h-7 rounded bg-blue-900 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
              <BriefcaseIcon className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-900 truncate max-w-[160px] sm:max-w-none">
              {data.name || "Professional Portfolio"}
            </span>
          </a>

          {navSections.length > 0 && (
            <div className="hidden sm:flex items-center gap-6 text-xs font-semibold tracking-wide uppercase text-slate-600">
              {navSections.map((sec) => (
                <a
                  key={sec.href}
                  href={sec.href}
                  className="hover:text-blue-900 transition-colors py-1 border-b-2 border-transparent hover:border-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2 rounded-sm"
                >
                  {sec.label}
                </a>
              ))}
            </div>
          )}

          {data.email && (
            <a
              href={`mailto:${data.email}`}
              className="px-4 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2"
            >
              Contact
            </a>
          )}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10 sm:py-16 space-y-16 sm:space-y-20">
        {/* ========================================================= */}
        {/* 2. Executive Hero Header */}
        {/* ========================================================= */}
        <header
          id="summary"
          className="scroll-mt-20 bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-xs"
        >
          <div className="flex flex-col-reverse md:flex-row md:items-start md:justify-between gap-8">
            <div className="space-y-4 flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-semibold tracking-wide uppercase bg-blue-50 text-blue-900 border border-blue-100">
                <span>Executive Profile</span>
              </div>

              <div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 tracking-tight break-words">
                  {data.name || "Professional Portfolio"}
                </h1>

                {data.title && (
                  <p className="text-lg sm:text-xl font-semibold text-blue-900 mt-1.5 break-words">
                    {data.title}
                  </p>
                )}
              </div>

              {data.location && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <MapPinIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="break-words">{data.location}</span>
                </div>
              )}

              {data.about && (
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed whitespace-pre-line pt-2 max-w-2xl border-t border-slate-100 break-words">
                  {data.about}
                </p>
              )}

              {/* Contact Info & Social Connections */}
              <address className="not-italic pt-4 flex flex-wrap items-center gap-y-2.5 gap-x-4 text-xs font-medium text-slate-600">
                {data.email && (
                  <a
                    href={`mailto:${data.email}`}
                    className="inline-flex items-center gap-1.5 hover:text-blue-900 transition-colors break-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2 rounded-sm py-1"
                  >
                    <MailIcon className="w-3.5 h-3.5 text-blue-900 flex-shrink-0" />
                    <span>{data.email}</span>
                  </a>
                )}

                {data.phone && (
                  <a
                    href={`tel:${data.phone}`}
                    className="inline-flex items-center gap-1.5 hover:text-blue-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2 rounded-sm py-1"
                  >
                    <PhoneIcon className="w-3.5 h-3.5 text-blue-900 flex-shrink-0" />
                    <span>{data.phone}</span>
                  </a>
                )}

                {socialEntries.map(([platform, url]) => (
                  <a
                    key={platform}
                    href={sanitizeUrl(url)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1.5 hover:text-blue-900 transition-colors capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2 rounded-sm py-1"
                    aria-label={`${platform} profile (opens in new tab)`}
                  >
                    <span className="text-blue-900">{getSocialIcon(platform)}</span>
                    <span>{platform}</span>
                  </a>
                ))}
              </address>
            </div>

            {/* Profile Avatar (only rendered if provided) */}
            {data.profileImageUrl && (
              <div className="flex-shrink-0">
                <img
                  src={data.profileImageUrl}
                  alt={data.name ? `${data.name}'s portrait` : "Executive portrait"}
                  className="w-28 h-28 sm:w-36 sm:h-36 rounded-xl object-cover border-2 border-slate-200 shadow-sm"
                />
              </div>
            )}
          </div>
        </header>

        {/* ========================================================= */}
        {/* 3. Professional Experience Section */}
        {/* ========================================================= */}
        {sortedExperiences.length > 0 && (
          <section id="experience" aria-labelledby="section-experience-heading" className="scroll-mt-20">
            <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-200">
              <div className="w-1.5 h-6 bg-blue-900 rounded-full" />
              <h2
                id="section-experience-heading"
                className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight"
              >
                Career History &amp; Experience
              </h2>
            </div>

            <div className="space-y-6">
              {sortedExperiences.map((exp) => (
                <article
                  key={exp.id}
                  className="bg-white border border-slate-200 border-l-4 border-l-blue-900 rounded-xl p-5 sm:p-6 shadow-2xs hover:shadow-xs transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1.5 mb-2">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900">
                        {exp.position}
                      </h3>
                      <div className="text-sm font-semibold text-blue-900 mt-0.5">
                        {exp.company}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded">
                        {formatDateRange(exp.startDate, exp.endDate, exp.isCurrent)}
                      </span>
                      {exp.isCurrent && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-900 border border-blue-200 rounded">
                          Current
                        </span>
                      )}
                    </div>
                  </div>

                  {exp.description && (
                    <p className="mt-3 text-sm text-slate-600 leading-relaxed whitespace-pre-line border-t border-slate-100 pt-3">
                      {exp.description}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* 4. Key Projects Section */}
        {/* ========================================================= */}
        {sortedProjects.length > 0 && (
          <section id="projects" aria-labelledby="section-projects-heading" className="scroll-mt-20">
            <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-200">
              <div className="w-1.5 h-6 bg-blue-900 rounded-full" />
              <h2
                id="section-projects-heading"
                className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight"
              >
                Key Engagements &amp; Projects
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sortedProjects.map((project) => (
                <article
                  key={project.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
                >
                  <div>
                    {project.imageUrl && (
                      <div className="mb-4 overflow-hidden rounded-lg aspect-video bg-slate-100 border border-slate-150">
                        <img
                          src={project.imageUrl}
                          alt={project.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="text-base font-bold text-slate-900 break-words">
                        {project.title}
                      </h3>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {project.githubUrl && (
                          <a
                            href={sanitizeUrl(project.githubUrl)}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-slate-400 hover:text-blue-900 transition-colors p-2 min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2"
                            aria-label={`Source repository for ${project.title} (opens in new tab)`}
                          >
                            <GithubIcon className="w-4 h-4" />
                          </a>
                        )}
                        {project.projectUrl && (
                          <a
                            href={sanitizeUrl(project.projectUrl)}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-slate-400 hover:text-blue-900 transition-colors p-2 min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2"
                            aria-label={`Live site for ${project.title} (opens in new tab)`}
                          >
                            <ExternalLinkIcon className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>

                    {project.description && (
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line mb-4">
                        {project.description}
                      </p>
                    )}
                  </div>

                  {project.technologies && project.technologies.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                      {project.technologies.map((tech, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded"
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
        {/* 5. Core Competencies & Skills Section */}
        {/* ========================================================= */}
        {groupedSkills.length > 0 && (
          <section id="skills" aria-labelledby="section-skills-heading" className="scroll-mt-20">
            <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-200">
              <div className="w-1.5 h-6 bg-blue-900 rounded-full" />
              <h2
                id="section-skills-heading"
                className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight"
              >
                Core Competencies &amp; Expertise
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupedSkills.map(([category, skills]) => (
                <div
                  key={category}
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3"
                >
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900">
                    {category}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <span
                        key={skill.id}
                        className="px-3 py-1 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-md hover:border-slate-300 transition-colors"
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
        {/* 6. Executive Contact Area */}
        {/* ========================================================= */}
        {(data.email || data.phone || socialEntries.length > 0) && (
          <section
            id="contact"
            aria-labelledby="section-contact-heading"
            className="scroll-mt-20 bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-xs text-center"
          >
            <h2
              id="section-contact-heading"
              className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-2"
            >
              Get In Touch
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mb-6">
              Available for leadership advisory, enterprise consulting, and executive opportunities.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              {data.email && (
                <a
                  href={`mailto:${data.email}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold text-white bg-blue-900 hover:bg-blue-800 transition-colors shadow-xs break-all max-w-full text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2"
                >
                  <MailIcon className="w-4 h-4 text-white flex-shrink-0" />
                  <span>{data.email}</span>
                </a>
              )}

              {data.phone && (
                <a
                  href={`tel:${data.phone}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2"
                >
                  <PhoneIcon className="w-4 h-4 text-blue-900 flex-shrink-0" />
                  <span>{data.phone}</span>
                </a>
              )}
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* 7. Classic Executive Footer */}
        {/* ========================================================= */}
        <footer className="pt-8 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>
            © {currentYear} {data.name || "Professional Portfolio"}. All rights reserved.
          </span>
          <span className="text-[11px] text-slate-400">Published with FolioCraft</span>
        </footer>
      </main>
    </div>
  );
}

export default TemplateProfessional;

import React from "react";
import { TemplateProps } from "../types";
import {
  MapPinIcon,
  MailIcon,
  PhoneIcon,
  GithubIcon,
  GlobeIcon,
  ExternalLinkIcon,
  CodeIcon,
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
 * TemplateModern — Technical, polished, developer-focused portfolio template.
 *
 * Design Principles:
 * - Sleek dark technical aesthetic (slate-950 backdrop with code-focused accents)
 * - Structured section hierarchy with anchor navigation
 * - Vibrant tech-stack chips and interactive project showcase
 * - Pure presentation component (no external state or side effects)
 */
export function TemplateModern({ data, className = "" }: TemplateProps): React.JSX.Element {
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
    const cat = (skill.category || "").trim() || "Technologies";
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

  // Determine which navigation anchors exist
  const navSections: Array<{ label: string; href: string }> = [];
  if (data.about) navSections.push({ label: "About", href: "#about" });
  if (sortedExperiences.length > 0) navSections.push({ label: "Experience", href: "#experience" });
  if (sortedProjects.length > 0) navSections.push({ label: "Projects", href: "#projects" });
  if (groupedSkills.length > 0) navSections.push({ label: "Skills", href: "#skills" });
  if (data.email || data.phone || socialEntries.length > 0) {
    navSections.push({ label: "Contact", href: "#contact" });
  }

  const brandIdentifier = data.username ? `~/${data.username}` : data.name || "portfolio";

  return (
    <div
      data-testid="template-modern"
      className={`template-modern min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/20 selection:text-emerald-300 ${className}`}
    >
      {/* ========================================================= */}
      {/* 1. Technical Top Navigation Bar */}
      {/* ========================================================= */}
      <nav
        aria-label="Portfolio Navigation"
        className="sticky top-0 z-20 backdrop-blur-md bg-slate-950/80 border-b border-slate-850 px-6 py-3.5 transition-colors"
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <a
            href="#about"
            className="flex items-center gap-2 font-mono text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded-sm"
          >
            <CodeIcon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="truncate max-w-[150px] sm:max-w-none">{brandIdentifier}</span>
          </a>

          {navSections.length > 0 && (
            <div className="hidden sm:flex items-center gap-6 text-xs font-mono text-slate-400">
              {navSections.map((sec) => (
                <a
                  key={sec.href}
                  href={sec.href}
                  className="hover:text-emerald-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded-sm py-1"
                >
                  {sec.label}
                </a>
              ))}
            </div>
          )}

          {data.email && (
            <a
              href={`mailto:${data.email}`}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Get in Touch
            </a>
          )}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12 sm:py-20 lg:py-24 space-y-20 sm:space-y-24">
        {/* ========================================================= */}
        {/* 2. Hero Section */}
        {/* ========================================================= */}
        <header id="about" className="scroll-mt-24">
          <div className="flex flex-col-reverse md:flex-row md:items-center md:justify-between gap-8 md:gap-12">
            <div className="space-y-4 flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-emerald-950/50 border border-emerald-500/30 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Available for new opportunities</span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white break-words">
                {data.name || "Developer Portfolio"}
              </h1>

              {data.title && (
                <p className="text-xl sm:text-2xl font-semibold text-emerald-400 font-mono tracking-tight break-words">
                  {data.title}
                </p>
              )}

              {data.location && (
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <MapPinIcon className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span className="break-words">{data.location}</span>
                </div>
              )}

              {data.about && (
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl whitespace-pre-line pt-2 break-words">
                  {data.about}
                </p>
              )}

              {/* Action Buttons & Social Links */}
              <div className="pt-4 flex flex-wrap items-center gap-3">
                {data.email && (
                  <a
                    href={`mailto:${data.email}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  >
                    <MailIcon className="w-4 h-4 flex-shrink-0" />
                    <span>Send Message</span>
                  </a>
                )}

                {data.phone && (
                  <a
                    href={`tel:${data.phone}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  >
                    <PhoneIcon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>{data.phone}</span>
                  </a>
                )}

                {socialEntries.map(([platform, url]) => (
                  <a
                    key={platform}
                    href={sanitizeUrl(url)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="p-2.5 rounded-lg text-slate-400 hover:text-emerald-400 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 min-h-[40px] min-w-[40px] inline-flex items-center justify-center"
                    aria-label={`${platform} profile (opens in new tab)`}
                  >
                    {getSocialIcon(platform)}
                  </a>
                ))}
              </div>
            </div>

            {/* Profile Avatar (only rendered if provided) */}
            {data.profileImageUrl && (
              <div className="flex-shrink-0">
                <div className="relative">
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 opacity-20 blur-md" />
                  <img
                    src={data.profileImageUrl}
                    alt={data.name ? `${data.name}'s avatar` : "Developer avatar"}
                    className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-2xl object-cover border-2 border-slate-800 shadow-xl"
                  />
                </div>
              </div>
            )}
          </div>
        </header>

        {/* ========================================================= */}
        {/* 3. Projects Section */}
        {/* ========================================================= */}
        {sortedProjects.length > 0 && (
          <section id="projects" aria-labelledby="section-projects-heading" className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-8">
              <h2
                id="section-projects-heading"
                className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2"
              >
                <span className="text-emerald-400 font-mono text-lg">01.</span>
                <span>Featured Projects</span>
              </h2>
              <div className="h-px flex-1 bg-slate-800" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sortedProjects.map((project) => (
                <article
                  key={project.id}
                  className="p-5 sm:p-6 rounded-xl bg-slate-900/60 border border-slate-850 hover:border-slate-700 transition-all flex flex-col justify-between group shadow-xs"
                >
                  <div>
                    {project.imageUrl && (
                      <div className="mb-4 overflow-hidden rounded-lg aspect-video bg-slate-950 border border-slate-800">
                        <img
                          src={project.imageUrl}
                          alt={project.title}
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-emerald-300 transition-colors break-words">
                        {project.title}
                      </h3>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {project.githubUrl && (
                          <a
                            href={sanitizeUrl(project.githubUrl)}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-slate-400 hover:text-emerald-400 transition-colors p-2 min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
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
                            className="text-slate-400 hover:text-emerald-400 transition-colors p-2 min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                            aria-label={`Live site for ${project.title} (opens in new tab)`}
                          >
                            <ExternalLinkIcon className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>

                    {project.description && (
                      <p className="text-xs sm:text-sm text-slate-400 leading-relaxed whitespace-pre-line mb-4">
                        {project.description}
                      </p>
                    )}
                  </div>

                  {project.technologies && project.technologies.length > 0 && (
                    <div className="pt-4 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                      {project.technologies.map((tech, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-xs font-mono text-emerald-300 bg-emerald-950/40 border border-emerald-500/20 rounded"
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
        {/* 4. Experience Section */}
        {/* ========================================================= */}
        {sortedExperiences.length > 0 && (
          <section id="experience" aria-labelledby="section-experience-heading" className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-8">
              <h2
                id="section-experience-heading"
                className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2"
              >
                <span className="text-emerald-400 font-mono text-lg">02.</span>
                <span>Work Experience</span>
              </h2>
              <div className="h-px flex-1 bg-slate-800" />
            </div>

            <div className="relative border-l border-slate-800 ml-3 sm:ml-4 pl-6 sm:pl-8 space-y-10">
              {sortedExperiences.map((exp) => (
                <article key={exp.id} className="relative group">
                  {/* Timeline dot */}
                  <div
                    aria-hidden="true"
                    className="absolute -left-[31px] sm:-left-[39px] top-1.5 w-3 h-3 rounded-full bg-slate-950 border-2 border-emerald-400 ring-4 ring-slate-950"
                  />

                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 mb-1">
                    <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                      {exp.position}
                    </h3>
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                      <span>{formatDateRange(exp.startDate, exp.endDate, exp.isCurrent)}</span>
                      {exp.isCurrent && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 rounded">
                          Current
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-sm font-semibold text-emerald-400 font-mono mb-3">
                    @{exp.company}
                  </div>

                  {exp.description && (
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed whitespace-pre-line">
                      {exp.description}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* 5. Skills Section */}
        {/* ========================================================= */}
        {groupedSkills.length > 0 && (
          <section id="skills" aria-labelledby="section-skills-heading" className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-8">
              <h2
                id="section-skills-heading"
                className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2"
              >
                <span className="text-emerald-400 font-mono text-lg">03.</span>
                <span>Technical Skills</span>
              </h2>
              <div className="h-px flex-1 bg-slate-800" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupedSkills.map(([category, skills]) => (
                <div
                  key={category}
                  className="p-5 rounded-xl bg-slate-900/40 border border-slate-850 space-y-3"
                >
                  <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-400">
                    {category}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <span
                        key={skill.id}
                        className="px-2.5 py-1 text-xs font-mono font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-md hover:border-slate-700 transition-colors"
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
        {/* 6. Contact / Get In Touch Section */}
        {/* ========================================================= */}
        {(data.email || data.phone || socialEntries.length > 0) && (
          <section
            id="contact"
            aria-labelledby="section-contact-heading"
            className="scroll-mt-24 text-center py-12 px-6 rounded-2xl bg-gradient-to-b from-slate-900/60 to-slate-950 border border-slate-800"
          >
            <h2
              id="section-contact-heading"
              className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3"
            >
              Let&apos;s Build Something Together
            </h2>
            <p className="text-sm text-slate-400 max-w-lg mx-auto mb-6">
              I&apos;m always open to discussing technical challenges, new software projects, or mentorship opportunities.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              {data.email && (
                <a
                  href={`mailto:${data.email}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-colors shadow-md break-all max-w-full text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  <MailIcon className="w-4 h-4 flex-shrink-0" />
                  <span>{data.email}</span>
                </a>
              )}

              {data.phone && (
                <a
                  href={`tel:${data.phone}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-mono font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  <PhoneIcon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>{data.phone}</span>
                </a>
              )}
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* 7. Modern Developer Footer */}
        {/* ========================================================= */}
        <footer className="pt-8 border-t border-slate-850 text-xs font-mono text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>
            © {currentYear} {data.name || "Developer"}. Designed &amp; deployed with FolioCraft.
          </span>
          <div className="flex items-center gap-4 text-slate-500">
            {socialEntries.map(([platform, url]) => (
              <a
                key={platform}
                href={sanitizeUrl(url)}
                target="_blank"
                rel="noreferrer noopener"
                className="hover:text-emerald-400 transition-colors capitalize"
              >
                {platform}
              </a>
            ))}
          </div>
        </footer>
      </main>
    </div>
  );
}

export default TemplateModern;

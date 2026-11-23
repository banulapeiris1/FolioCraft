import React from "react";
import { TemplateProps } from "../types";
import { ProjectTitleLink } from "../site/ProjectTitleLink";
import {
  formatDateRange,
  formatTenure,
  getInitials,
  getPortfolioStats,
  getSafeSocialLinks,
  sortExperiences,
  sortProjects,
} from "../site/siteModel";
import { ExternalLink } from "../shared/ExternalLink";
import { MailIcon, MapPinIcon, PhoneIcon } from "@/components/portfolio/PortfolioIcons";
import { getTemplateMotion, heroItemProps, revealProps } from "../motion/motionConfig";

// Restrained by design; resolveMotionMode also caps this template at "subtle".
// No reveal markers inside the sticky sidebar: content in a sticky box taller
// than the viewport might never scroll into view.
const motion = getTemplateMotion("executive");

/**
 * Executive Suite — leadership portfolio (Phase 13).
 *
 * Identity: a sticky charcoal profile sidebar (portrait, contact, core
 * competencies) beside an ivory reading column with an executive summary, a
 * row of key figures, a tenure-led career history and selected engagements.
 * Source Serif headings with a muted gold accent.
 */

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b08d57] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbfaf7]";
const FOCUS_DARK =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d6b98a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1f2329]";

const MAX_COMPETENCIES = 12;

function SectionTitle({ id, kicker, children }: { id: string; kicker: string; children: React.ReactNode }) {
  return (
    <header className="mb-8" {...motion.heading()}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9a7742]">{kicker}</p>
      <h2 id={id} className="mt-2 font-text-serif text-2xl sm:text-3xl font-semibold text-[#1f2329] tracking-tight">
        {children}
      </h2>
      <div aria-hidden="true" className="mt-4 h-px w-16 bg-[#b08d57]" />
    </header>
  );
}

export function TemplateExecutive({
  data,
  className = "",
  siteNav,
  getProjectHref,
}: TemplateProps): React.JSX.Element {
  const year = new Date().getFullYear();
  const projects = sortProjects(data.projects || []);
  const experiences = sortExperiences(data.experiences || []);
  const competencies = [...(data.skills || [])]
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
    .slice(0, MAX_COMPETENCIES);
  const socials = getSafeSocialLinks(data.socialLinks);
  const stats = getPortfolioStats(data);
  const name = data.name || "Portfolio";
  const Main = siteNav ? "div" : "main";

  const figures = [
    stats.roles > 0 && { value: String(stats.roles), label: stats.roles === 1 ? "Leadership role" : "Roles held" },
    stats.since !== null && { value: String(stats.since), label: "Career since" },
    stats.projects > 0 && { value: String(stats.projects), label: stats.projects === 1 ? "Engagement" : "Engagements" },
    stats.skills > 0 && { value: String(stats.skills), label: "Competencies" },
  ].filter(Boolean) as Array<{ value: string; label: string }>;

  const anchors = [
    data.about && { href: "#summary", label: "Summary" },
    experiences.length > 0 && { href: "#career", label: "Career" },
    projects.length > 0 && { href: "#engagements", label: "Engagements" },
    data.email && { href: `mailto:${data.email}`, label: "Contact" },
  ].filter(Boolean) as Array<{ href: string; label: string }>;

  return (
    <div
      data-testid="template-executive"
      className={`template-executive min-h-screen bg-[#fbfaf7] text-[#2b2f36] font-sans selection:bg-[#b08d57]/25 selection:text-[#1f2329] overflow-x-clip ${className}`}
    >
      {siteNav ?? (
        <nav aria-label="Executive Suite Navigation" className="border-b border-[#e7e2d8] bg-[#fbfaf7]/95">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
            <a href="#top" className={`font-text-serif text-lg font-semibold text-[#1f2329] truncate rounded-sm ${FOCUS}`}>
              {name}
            </a>
            {anchors.length > 0 && (
              <ul className="flex items-center gap-4 sm:gap-7 overflow-x-auto">
                {anchors.map((anchor) => (
                  <li key={anchor.href}>
                    <a
                      href={anchor.href}
                      className={`text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-[#5b6170] hover:text-[#9a7742] whitespace-nowrap rounded-sm ${FOCUS}`}
                    >
                      {anchor.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </nav>
      )}

      <div id="top" className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-8 lg:gap-12 items-start">
        {/* Profile sidebar */}
        <aside
          aria-label="Profile summary"
          data-testid="executive-sidebar"
          className={`bg-[#1f2329] text-[#e9e6df] p-6 sm:p-8 lg:sticky ${siteNav ? "lg:top-24" : "lg:top-8"} min-w-0`}
        >
          <div className="flex lg:flex-col items-center lg:items-start gap-5">
            {data.profileImageUrl ? (
              <img
                src={data.profileImageUrl}
                alt={`${name}'s profile photo`}
                className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 object-cover ring-1 ring-[#b08d57] ring-offset-4 ring-offset-[#1f2329] flex-shrink-0"
                {...heroItemProps(0)}
              />
            ) : (
              <span
                aria-hidden="true"
                className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center border border-[#b08d57] font-text-serif text-2xl sm:text-3xl text-[#d6b98a] flex-shrink-0"
                {...heroItemProps(0)}
              >
                {getInitials(data.name)}
              </span>
            )}
            <div className="min-w-0" {...heroItemProps(1)}>
              <h1 className="font-text-serif text-2xl sm:text-3xl font-semibold text-white leading-tight break-words">{name}</h1>
              {data.title && <p className="mt-2 text-sm text-[#d6b98a] leading-snug break-words">{data.title}</p>}
            </div>
          </div>

          {(data.email || data.phone || data.location) && (
            <address className="not-italic mt-8 pt-6 border-t border-white/10 space-y-3 text-sm" {...heroItemProps(2)}>
              {data.email && (
                <a href={`mailto:${data.email}`} className={`flex items-center gap-3 hover:text-white break-all rounded-sm ${FOCUS_DARK}`}>
                  <MailIcon className="w-4 h-4 text-[#b08d57] flex-shrink-0" />
                  <span>{data.email}</span>
                </a>
              )}
              {data.phone && (
                <a href={`tel:${data.phone}`} className={`flex items-center gap-3 hover:text-white rounded-sm ${FOCUS_DARK}`}>
                  <PhoneIcon className="w-4 h-4 text-[#b08d57] flex-shrink-0" />
                  <span>{data.phone}</span>
                </a>
              )}
              {data.location && (
                <p className="flex items-center gap-3">
                  <MapPinIcon className="w-4 h-4 text-[#b08d57] flex-shrink-0" />
                  <span className="break-words">{data.location}</span>
                </p>
              )}
            </address>
          )}

          {competencies.length > 0 && (
            <section aria-labelledby="executive-competencies" className="mt-8 pt-6 border-t border-white/10">
              <h2 id="executive-competencies" className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d6b98a]">
                Core Competencies
              </h2>
              <ul className="mt-4 space-y-2 text-sm">
                {competencies.map((skill) => (
                  <li key={skill.id} className="flex items-start gap-3 min-w-0">
                    <span aria-hidden="true" className="mt-2 w-1.5 h-1.5 rotate-45 bg-[#b08d57] flex-shrink-0" />
                    <span className="break-words">{skill.name}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {socials.length > 0 && (
            <ul className="mt-8 pt-6 border-t border-white/10 flex flex-wrap gap-2">
              {socials.map((link) => (
                <li key={link.platform}>
                  <ExternalLink
                    href={link.href}
                    className={`inline-block px-3 py-1.5 text-xs border border-white/20 hover:border-[#b08d57] hover:text-white transition-colors ${FOCUS_DARK}`}
                  >
                    {link.label}
                  </ExternalLink>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Reading column */}
        <Main id={siteNav ? undefined : "main-content"} className="min-w-0 space-y-16 sm:space-y-20">
          {data.about && (
            <section id="summary" aria-labelledby="executive-summary" className="scroll-mt-24" {...motion.section()}>
              <SectionTitle id="executive-summary" kicker="Profile">
                Executive Summary
              </SectionTitle>
              <p className="font-text-serif text-lg sm:text-xl leading-relaxed text-[#2b2f36] whitespace-pre-line break-words max-w-3xl" {...motion.item()}>
                {data.about}
              </p>
            </section>
          )}

          {figures.length > 0 && (
            <section aria-label="Key figures" data-testid="executive-figures" {...revealProps()}>
              <dl className="grid grid-cols-2 md:grid-cols-4 border-y border-[#e7e2d8] divide-x divide-[#e7e2d8]">
                {figures.map((figure) => (
                  <div key={figure.label} className="px-4 py-6 min-w-0">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a8090]">{figure.label}</dt>
                    <dd className="mt-2 font-text-serif text-3xl sm:text-4xl font-semibold text-[#1f2329]">{figure.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {experiences.length > 0 && (
            <section id="career" aria-labelledby="executive-career" className="scroll-mt-24" {...motion.section()}>
              <SectionTitle id="executive-career" kicker="Track record">
                Career History
              </SectionTitle>
              <ol className="space-y-6">
                {experiences.map((exp) => {
                  const tenure = formatTenure(exp.startDate, exp.endDate, exp.isCurrent);
                  return (
                    <li
                      key={exp.id}
                      className={`bg-white border border-[#e7e2d8] p-5 sm:p-7 border-l-4 ${exp.isCurrent ? "border-l-[#b08d57]" : "border-l-[#1f2329]"}`}
                      {...motion.item()}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-text-serif text-xl sm:text-2xl font-semibold text-[#1f2329] break-words">
                            {exp.position || exp.company}
                          </h3>
                          {exp.position && exp.company && (
                            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#9a7742] break-words">
                              {exp.company}
                            </p>
                          )}
                        </div>
                        <div className="sm:text-right flex-shrink-0">
                          <p className="text-sm text-[#5b6170]">{formatDateRange(exp.startDate, exp.endDate, exp.isCurrent)}</p>
                          {(tenure || exp.isCurrent) && (
                            <p className="mt-1 text-xs font-semibold text-[#1f2329] flex sm:justify-end items-center gap-2">
                              {tenure && <span>{tenure}</span>}
                              {exp.isCurrent && (
                                <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider bg-[#1f2329] text-[#d6b98a]">Current</span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                      {exp.description && (
                        <p className="mt-4 text-sm sm:text-base leading-relaxed text-[#454a55] whitespace-pre-line break-words">
                          {exp.description}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {projects.length > 0 && (
            <section id="engagements" aria-labelledby="executive-engagements" className="scroll-mt-24" {...motion.section()}>
              <SectionTitle id="executive-engagements" kicker="Portfolio">
                Selected Engagements
              </SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#e7e2d8] border border-[#e7e2d8]" {...motion.item()}>
                {projects.map((project, index) => (
                  <article key={project.id} className="bg-[#fbfaf7] p-6 flex flex-col min-w-0 md:last:odd:col-span-2">
                    <p className="font-text-serif text-sm text-[#9a7742]">{String(index + 1).padStart(2, "0")}</p>
                    <h3 className="mt-2 font-text-serif text-xl font-semibold text-[#1f2329] break-words">
                      <ProjectTitleLink project={project} getProjectHref={getProjectHref} className={FOCUS} />
                    </h3>
                    {project.description && (
                      <p className="mt-3 text-sm leading-relaxed text-[#454a55] line-clamp-4 break-words">{project.description}</p>
                    )}
                    {project.technologies.length > 0 && (
                      <p className="mt-4 text-xs text-[#5b6170] break-words">
                        <span className="font-semibold uppercase tracking-[0.14em] text-[#1f2329]">Capabilities: </span>
                        {project.technologies.join(", ")}
                      </p>
                    )}
                    <div className="mt-auto pt-5 flex flex-wrap gap-4 text-xs font-semibold uppercase tracking-[0.14em]">
                      <ExternalLink href={project.projectUrl} label={`View ${project.title}`} className={`text-[#9a7742] hover:text-[#1f2329] rounded-sm ${FOCUS}`}>
                        View →
                      </ExternalLink>
                      <ExternalLink href={project.githubUrl} label={`Repository for ${project.title}`} className={`text-[#5b6170] hover:text-[#1f2329] rounded-sm ${FOCUS}`}>
                        Repository →
                      </ExternalLink>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {!data.about && experiences.length === 0 && projects.length === 0 && (
            <p className="font-text-serif text-xl text-[#5b6170] border-l-4 border-[#b08d57] pl-5">
              Executive profile details are being prepared.
            </p>
          )}
        </Main>
      </div>

      <footer className="border-t border-[#e7e2d8]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#7a8090] text-center">
          <span>
            © {year} {name}. All rights reserved.
          </span>
          <span>Published with FolioCraft</span>
        </div>
      </footer>
    </div>
  );
}

export default TemplateExecutive;

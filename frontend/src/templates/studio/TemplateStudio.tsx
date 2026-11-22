import React from "react";
import { TemplateProps } from "../types";
import { ProjectTitleLink } from "../site/ProjectTitleLink";
import {
  formatDateRange,
  getInitials,
  getSafeSocialLinks,
  groupSkills,
  sortExperiences,
  sortProjects,
} from "../site/siteModel";
import { ExternalLink } from "../shared/ExternalLink";
import { ArrowRightIcon } from "@/components/portfolio/PortfolioIcons";

/**
 * Creative Studio — agency-style portfolio (Phase 13).
 *
 * Identity: near-black canvas with a signal-orange accent and Space Grotesk
 * display type. Oversized uppercase hero, a tilted portrait with an offset
 * colour block, a scrolling skills band (static under prefers-reduced-motion),
 * full-bleed project showcases that alternate sides, a large "track record"
 * list and a giant contact call-to-action.
 */

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5b1f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]";

export function TemplateStudio({
  data,
  className = "",
  siteNav,
  getProjectHref,
}: TemplateProps): React.JSX.Element {
  const year = new Date().getFullYear();
  const projects = sortProjects(data.projects || []);
  const experiences = sortExperiences(data.experiences || []);
  const skillGroups = groupSkills(data.skills || []);
  const skillNames = skillGroups.flatMap(([, skills]) => skills.map((skill) => skill.name));
  const socials = getSafeSocialLinks(data.socialLinks);
  const name = data.name || "Portfolio";
  const Main = siteNav ? "div" : "main";

  const anchors = [
    projects.length > 0 && { href: "#work", label: "Work" },
    skillGroups.length > 0 && { href: "#capabilities", label: "Capabilities" },
    experiences.length > 0 && { href: "#record", label: "Record" },
  ].filter(Boolean) as Array<{ href: string; label: string }>;

  return (
    <div
      data-testid="template-studio"
      className={`template-studio @container min-h-screen bg-[#111111] text-[#f2efe8] font-grotesk selection:bg-[#ff5b1f] selection:text-[#111111] overflow-x-hidden ${className}`}
    >
      {siteNav ?? (
        <nav aria-label="Studio Navigation" className="border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between gap-4">
            <a href="#top" className={`font-bold uppercase tracking-tight text-sm sm:text-base truncate rounded-sm ${FOCUS}`}>
              {name}
              <span className="text-[#ff5b1f]">.</span>
            </a>
            <div className="flex items-center gap-4 sm:gap-8">
              <ul className="hidden sm:flex items-center gap-6 text-sm">
                {anchors.map((anchor) => (
                  <li key={anchor.href}>
                    <a href={anchor.href} className={`text-white/70 hover:text-[#ff5b1f] rounded-sm ${FOCUS}`}>
                      {anchor.label}
                    </a>
                  </li>
                ))}
              </ul>
              {data.email && (
                <a href={`mailto:${data.email}`} className={`px-4 py-2 rounded-full bg-[#ff5b1f] text-[#111111] text-xs sm:text-sm font-bold hover:bg-[#ff7a45] transition-colors ${FOCUS}`}>
                  Let&apos;s talk
                </a>
              )}
            </div>
          </div>
        </nav>
      )}

      <Main id={siteNav ? undefined : "main-content"}>
        {/* Hero */}
        <header id="top" className="max-w-7xl mx-auto px-4 sm:px-8 pt-12 sm:pt-20 pb-16 sm:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-end">
            <div className={`min-w-0 ${data.profileImageUrl ? "lg:col-span-8" : "lg:col-span-12"}`}>
              {data.title && (
                <p className="mb-6 inline-flex items-center gap-3 text-sm sm:text-base font-medium text-[#ff5b1f] break-words">
                  <span aria-hidden="true" className="w-8 h-px bg-[#ff5b1f] flex-shrink-0" />
                  {data.title}
                </p>
              )}
              <h1 className="font-bold uppercase tracking-tighter leading-[0.85] text-5xl @md:text-6xl @2xl:text-8xl @5xl:text-[8.5rem] break-words">
                {name}
              </h1>
              {data.location && <p className="mt-6 text-sm uppercase tracking-[0.2em] text-white/50 break-words">Based in {data.location}</p>}
            </div>
            {data.profileImageUrl && (
              <div className="lg:col-span-4 min-w-0 flex lg:justify-end">
                <div className="relative w-56 sm:w-64 lg:w-full max-w-xs">
                  <div aria-hidden="true" className="absolute inset-0 translate-x-4 translate-y-4 bg-[#ff5b1f]" />
                  <img
                    src={data.profileImageUrl}
                    alt={`${name}'s profile photo`}
                    className="relative w-full aspect-[3/4] object-cover -rotate-2 border-4 border-[#f2efe8]"
                  />
                </div>
              </div>
            )}
          </div>
          {data.about && (
            <p className="mt-12 sm:mt-16 max-w-3xl text-lg sm:text-2xl leading-snug text-white/80 whitespace-pre-line break-words">{data.about}</p>
          )}
        </header>

        {/* Skills band (decorative motion; the accessible list is in Capabilities) */}
        {skillNames.length > 0 && (
          <div aria-hidden="true" data-testid="studio-marquee" className="bg-[#ff5b1f] text-[#111111] overflow-hidden border-y-4 border-[#111111] -rotate-1 scale-[1.02]">
            <div className="flex w-max animate-marquee motion-reduce:animate-none py-4">
              {[0, 1].map((copy) => (
                <ul key={copy} className="flex items-center flex-shrink-0">
                  {skillNames.map((skillName, i) => (
                    <li key={`${copy}-${i}`} className="flex items-center text-2xl sm:text-4xl font-bold uppercase tracking-tight whitespace-nowrap">
                      <span className="px-6">{skillName}</span>
                      <span className="text-[#111111]/40">✦</span>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
        )}

        {/* Work */}
        {projects.length > 0 && (
          <section id="work" aria-labelledby="studio-work" className="max-w-7xl mx-auto px-4 sm:px-8 py-20 sm:py-28 scroll-mt-20">
            <div className="flex items-end justify-between gap-6 mb-14 sm:mb-20">
              <h2 id="studio-work" className="text-5xl @2xl:text-7xl font-bold uppercase tracking-tighter leading-none">
                Selected<br />
                <span className="text-[#ff5b1f]">Work</span>
              </h2>
              <p className="text-sm text-white/50 tabular-nums">({String(projects.length).padStart(2, "0")})</p>
            </div>
            <ol className="space-y-24 sm:space-y-32">
              {projects.map((project, index) => {
                const flipped = index % 2 === 1;
                return (
                  <li key={project.id} data-testid="studio-showcase" className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
                    <div className={`md:col-span-7 min-w-0 ${flipped ? "md:order-last" : ""}`}>
                      <div className="relative">
                        <div aria-hidden="true" className={`absolute inset-0 ${flipped ? "-translate-x-3" : "translate-x-3"} translate-y-3 border-2 border-[#ff5b1f]`} />
                        {project.imageUrl ? (
                          <img src={project.imageUrl} alt={`Screenshot of ${project.title}`} loading="lazy" className="relative w-full aspect-[16/10] object-cover" />
                        ) : (
                          <div aria-hidden="true" className="relative w-full aspect-[16/10] bg-[#f2efe8] text-[#111111] flex items-center justify-center">
                            <span className="text-7xl sm:text-9xl font-bold tracking-tighter">{getInitials(project.title)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <article className="md:col-span-5 min-w-0">
                      <p className="text-sm text-[#ff5b1f] tabular-nums">({String(index + 1).padStart(2, "0")})</p>
                      <h3 className="mt-3 text-3xl @2xl:text-5xl font-bold uppercase tracking-tighter leading-[0.95] break-words">
                        <ProjectTitleLink project={project} getProjectHref={getProjectHref} className={FOCUS} />
                      </h3>
                      {project.description && (
                        <p className="mt-5 text-base sm:text-lg leading-relaxed text-white/70 whitespace-pre-line break-words">{project.description}</p>
                      )}
                      {project.technologies.length > 0 && (
                        <ul className="mt-6 flex flex-wrap gap-2" aria-label={`Technologies used in ${project.title}`}>
                          {project.technologies.map((tech, i) => (
                            <li key={`${tech}-${i}`} className="px-3 py-1 rounded-full border border-white/25 text-xs uppercase tracking-wider">
                              {tech}
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-8 flex flex-wrap gap-6 text-sm font-bold uppercase tracking-wider">
                        <ExternalLink href={project.projectUrl} label={`View ${project.title} live`} className={`inline-flex items-center gap-2 text-[#ff5b1f] hover:text-white rounded-sm ${FOCUS}`}>
                          View live
                          <ArrowRightIcon className="w-4 h-4 -rotate-45" />
                        </ExternalLink>
                        <ExternalLink href={project.githubUrl} label={`Source code for ${project.title}`} className={`inline-flex items-center gap-2 text-white/70 hover:text-white rounded-sm ${FOCUS}`}>
                          Source
                          <ArrowRightIcon className="w-4 h-4 -rotate-45" />
                        </ExternalLink>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {/* Capabilities */}
        {skillGroups.length > 0 && (
          <section id="capabilities" aria-labelledby="studio-capabilities" className="bg-[#f2efe8] text-[#111111] scroll-mt-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-20 sm:py-24 grid grid-cols-1 lg:grid-cols-12 gap-10">
              <h2 id="studio-capabilities" className="lg:col-span-4 text-5xl @2xl:text-6xl font-bold uppercase tracking-tighter leading-none">
                Capa&shy;bilities
              </h2>
              <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-10">
                {skillGroups.map(([category, skills]) => (
                  <div key={category} className="min-w-0 border-t-4 border-[#111111] pt-4">
                    <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-[#c2410c]">{category}</h3>
                    <ul className="mt-4 space-y-1.5">
                      {skills.map((skill) => (
                        <li key={skill.id} className="text-xl sm:text-2xl font-bold tracking-tight break-words">
                          {skill.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Track record */}
        {experiences.length > 0 && (
          <section id="record" aria-labelledby="studio-record" className="max-w-7xl mx-auto px-4 sm:px-8 py-20 sm:py-28 scroll-mt-20">
            <h2 id="studio-record" className="mb-12 text-5xl @2xl:text-7xl font-bold uppercase tracking-tighter leading-none">
              Track <span className="text-[#ff5b1f]">Record</span>
            </h2>
            <ol className="border-t border-white/15">
              {experiences.map((exp) => (
                <li key={exp.id} className="group grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-8 py-8 border-b border-white/15 hover:bg-[#ff5b1f] hover:text-[#111111] transition-colors md:px-4">
                  <p className="md:col-span-3 text-sm uppercase tracking-wider text-white/50 group-hover:text-[#111111]/70">
                    {formatDateRange(exp.startDate, exp.endDate, exp.isCurrent)}
                  </p>
                  <div className="md:col-span-9 min-w-0">
                    <h3 className="text-2xl sm:text-4xl font-bold uppercase tracking-tight break-words">{exp.position || exp.company}</h3>
                    {exp.position && exp.company && <p className="mt-1 text-lg text-[#ff5b1f] group-hover:text-[#111111] break-words">{exp.company}</p>}
                    {exp.description && (
                      <p className="mt-3 text-base leading-relaxed text-white/70 group-hover:text-[#111111]/80 whitespace-pre-line break-words max-w-3xl">
                        {exp.description}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {projects.length === 0 && skillGroups.length === 0 && experiences.length === 0 && (
          <p className="max-w-7xl mx-auto px-4 sm:px-8 pb-20 text-2xl font-bold uppercase tracking-tight text-white/40">Work in progress.</p>
        )}
      </Main>

      {/* Contact CTA + footer */}
      <footer className="border-t border-white/10">
        {(data.email || socials.length > 0) && (
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-20 sm:py-28">
            <p className="text-sm uppercase tracking-[0.2em] text-white/50">Have a project in mind?</p>
            {data.email ? (
              <a href={`mailto:${data.email}`} className={`mt-4 inline-block text-3xl @md:text-4xl @2xl:text-6xl @5xl:text-7xl font-bold tracking-tighter hover:text-[#ff5b1f] transition-colors break-all rounded-sm ${FOCUS}`}>
                {data.email}
              </a>
            ) : (
              <p className="mt-4 text-4xl sm:text-6xl font-bold uppercase tracking-tighter">Let&apos;s connect</p>
            )}
            {(socials.length > 0 || data.phone) && (
              <ul className="mt-10 flex flex-wrap gap-3">
                {data.phone && (
                  <li>
                    <a href={`tel:${data.phone}`} className={`inline-block px-5 py-2.5 rounded-full border border-white/25 text-sm hover:border-[#ff5b1f] hover:text-[#ff5b1f] ${FOCUS}`}>
                      {data.phone}
                    </a>
                  </li>
                )}
                {socials.map((link) => (
                  <li key={link.platform}>
                    <ExternalLink href={link.href} className={`inline-block px-5 py-2.5 rounded-full border border-white/25 text-sm hover:border-[#ff5b1f] hover:text-[#ff5b1f] ${FOCUS}`}>
                      {link.label}
                    </ExternalLink>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs uppercase tracking-[0.18em] text-white/40 text-center">
            <span>
              © {year} {name}. All rights reserved.
            </span>
            <span>Published with FolioCraft</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default TemplateStudio;

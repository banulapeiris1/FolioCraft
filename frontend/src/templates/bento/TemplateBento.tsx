import React from "react";
import { TemplateProps } from "../types";
import { ProjectTitleLink } from "../site/ProjectTitleLink";
import {
  formatDateRange,
  getInitials,
  getPortfolioStats,
  getSafeSocialLinks,
  groupSkills,
  sortExperiences,
  sortProjects,
} from "../site/siteModel";
import { ExternalLink } from "../shared/ExternalLink";
import { ArrowRightIcon, GithubIcon, MailIcon, MapPinIcon } from "@/components/portfolio/PortfolioIcons";

/**
 * Bento Developer — tile-grid portfolio (Phase 13).
 *
 * Identity: the whole home page is one asymmetric bento grid of rounded tiles
 * on a warm grey canvas — a large profile tile, a black "at a glance" stats
 * tile, a lime "now" tile, a featured-project tile, compact project tiles, a
 * skills cloud and a mini timeline. Space Grotesk headings.
 */

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#18181b] focus-visible:ring-offset-2 focus-visible:ring-offset-[#efeee9]";

const TILE = "rounded-3xl p-6 sm:p-7 min-w-0";
const TILE_LIGHT = `${TILE} bg-white border border-black/5`;
const TILE_LABEL = "font-grotesk text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500";

const MAX_SIDE_PROJECTS = 4;
const MAX_TIMELINE = 4;

export function TemplateBento({
  data,
  className = "",
  siteNav,
  getProjectHref,
}: TemplateProps): React.JSX.Element {
  const year = new Date().getFullYear();
  const projects = sortProjects(data.projects || []);
  const [featured, ...rest] = projects;
  const sideProjects = rest.slice(0, MAX_SIDE_PROJECTS);
  const moreProjects = rest.slice(MAX_SIDE_PROJECTS);
  const experiences = sortExperiences(data.experiences || []);
  const current = experiences.find((exp) => exp.isCurrent) || null;
  const skillGroups = groupSkills(data.skills || []);
  const socials = getSafeSocialLinks(data.socialLinks);
  const stats = getPortfolioStats(data);
  const name = data.name || "Portfolio";
  const Main = siteNav ? "div" : "main";

  const glance = [
    { value: stats.projects, label: stats.projects === 1 ? "Project" : "Projects" },
    { value: stats.technologies, label: stats.technologies === 1 ? "Technology" : "Technologies" },
    { value: stats.roles, label: stats.roles === 1 ? "Role" : "Roles" },
  ].filter((item) => item.value > 0);

  const anchors = [
    projects.length > 0 && { href: "#projects", label: "Projects" },
    skillGroups.length > 0 && { href: "#skills", label: "Skills" },
    experiences.length > 0 && { href: "#experience", label: "Experience" },
    (data.email || socials.length > 0) && { href: "#contact", label: "Contact" },
  ].filter(Boolean) as Array<{ href: string; label: string }>;

  return (
    <div
      data-testid="template-bento"
      className={`template-bento min-h-screen bg-[#efeee9] text-zinc-900 font-sans selection:bg-lime-300 selection:text-zinc-900 overflow-x-hidden ${className}`}
    >
      {siteNav ?? (
        <div className="sticky top-3 z-20 px-4 pt-3">
          <nav
            aria-label="Bento Portfolio Navigation"
            className="max-w-6xl mx-auto flex items-center justify-between gap-3 rounded-full bg-white/90 backdrop-blur border border-black/5 shadow-sm pl-2 pr-2 sm:pr-3 py-2"
          >
            <a href="#top" className={`flex items-center gap-2 min-w-0 rounded-full ${FOCUS}`}>
              <span aria-hidden="true" className="w-8 h-8 rounded-full bg-zinc-900 text-lime-300 font-grotesk text-xs font-bold flex items-center justify-center flex-shrink-0">
                {getInitials(data.name)}
              </span>
              <span className="font-grotesk text-sm font-semibold truncate">{name}</span>
            </a>
            {anchors.length > 0 && (
              <ul className="flex items-center gap-1 overflow-x-auto">
                {anchors.map((anchor) => (
                  <li key={anchor.href}>
                    <a
                      href={anchor.href}
                      className={`block px-3 py-1.5 rounded-full text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 whitespace-nowrap ${FOCUS}`}
                    >
                      {anchor.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </nav>
        </div>
      )}

      <Main id={siteNav ? undefined : "main-content"} className="max-w-6xl mx-auto px-4 py-6 sm:py-10">
        <div id="top" data-testid="bento-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 auto-rows-auto">
          {/* Profile tile */}
          <section aria-label="Profile" data-testid="bento-tile-profile" className={`${TILE_LIGHT} sm:col-span-2 lg:row-span-2 flex flex-col`}>
            <div className="flex items-center gap-4">
              {data.profileImageUrl ? (
                <img src={data.profileImageUrl} alt={`${name}'s profile photo`} className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover flex-shrink-0" />
              ) : (
                <span aria-hidden="true" className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-lime-300 font-grotesk text-2xl font-bold flex items-center justify-center flex-shrink-0">
                  {getInitials(data.name)}
                </span>
              )}
              {data.location && (
                <p className="inline-flex items-center gap-1.5 text-xs text-zinc-500 min-w-0">
                  <MapPinIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="break-words">{data.location}</span>
                </p>
              )}
            </div>
            <h1 className="mt-6 font-grotesk text-4xl sm:text-5xl font-bold tracking-tight leading-[1.02] break-words">{name}</h1>
            {data.title && <p className="mt-2 font-grotesk text-lg sm:text-xl text-zinc-500 break-words">{data.title}</p>}
            {data.about && (
              <p className="mt-5 text-sm sm:text-base leading-relaxed text-zinc-700 whitespace-pre-line break-words line-clamp-[8]">{data.about}</p>
            )}
            {data.email && (
              <a
                href={`mailto:${data.email}`}
                className={`mt-auto pt-6 inline-flex items-center gap-2 self-start group ${FOCUS} rounded-full`}
              >
                <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-zinc-900 text-white text-sm font-semibold group-hover:bg-zinc-700 transition-colors">
                  Get in touch
                  <ArrowRightIcon className="w-4 h-4" />
                </span>
              </a>
            )}
          </section>

          {/* At a glance */}
          {glance.length > 0 && (
            <section aria-labelledby="bento-glance" data-testid="bento-tile-stats" className={`${TILE} bg-zinc-900 text-white`}>
              <h2 id="bento-glance" className="font-grotesk text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
                At a glance
              </h2>
              <dl className="mt-5 space-y-4">
                {glance.map((item) => (
                  <div key={item.label} className="flex items-baseline justify-between gap-3">
                    <dt className="text-sm text-zinc-400">{item.label}</dt>
                    <dd className="font-grotesk text-3xl font-bold text-lime-300 tabular-nums">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {/* Now */}
          {(current || experiences[0]) && (
            <section aria-labelledby="bento-now" data-testid="bento-tile-now" className={`${TILE} bg-lime-300`}>
              <h2 id="bento-now" className="font-grotesk text-xs font-semibold uppercase tracking-[0.16em] text-zinc-700">
                {current ? "Currently" : "Most recently"}
              </h2>
              <p className="mt-4 font-grotesk text-2xl font-bold leading-tight break-words">
                {(current || experiences[0]).position || (current || experiences[0]).company}
              </p>
              {(current || experiences[0]).position && (current || experiences[0]).company && (
                <p className="mt-1 text-sm font-medium text-zinc-700 break-words">@ {(current || experiences[0]).company}</p>
              )}
              {stats.since !== null && <p className="mt-4 text-xs text-zinc-700">Building since {stats.since}</p>}
            </section>
          )}

          {/* Contact */}
          {(data.email || socials.length > 0) && (
            <section id="contact" aria-labelledby="bento-contact" className={`${TILE_LIGHT} sm:col-span-2 scroll-mt-24`}>
              <h2 id="bento-contact" className={TILE_LABEL}>
                Contact
              </h2>
              <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {data.email && (
                  <li className="sm:col-span-2">
                    <a href={`mailto:${data.email}`} className={`flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 hover:bg-zinc-100 transition-colors ${FOCUS}`}>
                      <MailIcon className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                      <span className="text-sm font-medium break-all">{data.email}</span>
                    </a>
                  </li>
                )}
                {socials.map((link) => (
                  <li key={link.platform}>
                    <ExternalLink href={link.href} className={`flex items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-50 hover:bg-zinc-100 transition-colors ${FOCUS}`}>
                      <span className="text-sm font-medium">{link.label}</span>
                      <ArrowRightIcon className="w-4 h-4 -rotate-45 text-zinc-400" />
                    </ExternalLink>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Featured project */}
          {featured && (
            <section
              id="projects"
              aria-labelledby="bento-featured"
              data-testid="bento-tile-featured"
              className="relative rounded-3xl overflow-hidden min-w-0 sm:col-span-2 lg:row-span-2 bg-zinc-900 text-white flex flex-col justify-end min-h-[320px] scroll-mt-24"
            >
              {featured.imageUrl && (
                <img src={featured.imageUrl} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-45" />
              )}
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
              <div className="relative p-6 sm:p-8">
                <h2 id="bento-featured" className="font-grotesk text-xs font-semibold uppercase tracking-[0.16em] text-lime-300">
                  Featured project
                </h2>
                <h3 className="mt-3 font-grotesk text-3xl sm:text-4xl font-bold tracking-tight break-words">
                  <ProjectTitleLink project={featured} getProjectHref={getProjectHref} className={FOCUS} />
                </h3>
                {featured.description && (
                  <p className="mt-3 text-sm sm:text-base text-zinc-300 leading-relaxed line-clamp-3 break-words">{featured.description}</p>
                )}
                {featured.technologies.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-1.5" aria-label={`Technologies used in ${featured.title}`}>
                    {featured.technologies.map((tech, i) => (
                      <li key={`${tech}-${i}`} className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 border border-white/15">
                        {tech}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-5 flex flex-wrap gap-2">
                  <ExternalLink href={featured.projectUrl} label={`Live demo of ${featured.title}`} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-lime-300 text-zinc-900 text-sm font-semibold hover:bg-lime-200 ${FOCUS}`}>
                    Live demo
                    <ArrowRightIcon className="w-4 h-4 -rotate-45" />
                  </ExternalLink>
                  <ExternalLink href={featured.githubUrl} label={`Source code for ${featured.title}`} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 text-white text-sm font-semibold hover:bg-white/20 ${FOCUS}`}>
                    <GithubIcon className="w-4 h-4" />
                    Source
                  </ExternalLink>
                </div>
              </div>
            </section>
          )}

          {/* Compact project tiles */}
          {sideProjects.map((project) => (
            <article key={project.id} data-testid="bento-tile-project" className={`${TILE_LIGHT} flex flex-col`}>
              <span aria-hidden="true" className="w-9 h-9 rounded-xl bg-zinc-100 font-grotesk text-sm font-bold flex items-center justify-center">
                {getInitials(project.title)}
              </span>
              <h3 className="mt-4 font-grotesk text-lg font-bold tracking-tight break-words">
                <ProjectTitleLink project={project} getProjectHref={getProjectHref} className={FOCUS} />
              </h3>
              {project.description && <p className="mt-2 text-sm text-zinc-600 leading-relaxed line-clamp-3 break-words">{project.description}</p>}
              {project.technologies.length > 0 && (
                <p className="mt-3 text-xs font-medium text-zinc-500 break-words">{project.technologies.slice(0, 4).join(" · ")}</p>
              )}
              <div className="mt-auto pt-4 flex gap-3 text-xs font-semibold">
                <ExternalLink href={project.projectUrl} label={`Live demo of ${project.title}`} className={`text-zinc-900 hover:underline underline-offset-4 rounded-sm ${FOCUS}`}>
                  Demo ↗
                </ExternalLink>
                <ExternalLink href={project.githubUrl} label={`Source code for ${project.title}`} className={`text-zinc-500 hover:text-zinc-900 rounded-sm ${FOCUS}`}>
                  Code ↗
                </ExternalLink>
              </div>
            </article>
          ))}

          {moreProjects.length > 0 && (
            <section aria-labelledby="bento-more-projects" className={`${TILE_LIGHT} sm:col-span-2 lg:col-span-4`}>
              <h2 id="bento-more-projects" className={TILE_LABEL}>
                More projects
              </h2>
              <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
                {moreProjects.map((project) => (
                  <li key={project.id} className="min-w-0 font-grotesk font-semibold break-words">
                    <ProjectTitleLink project={project} getProjectHref={getProjectHref} className={FOCUS} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Skills */}
          {skillGroups.length > 0 && (
            <section id="skills" aria-labelledby="bento-skills" data-testid="bento-tile-skills" className={`${TILE_LIGHT} sm:col-span-2 scroll-mt-24`}>
              <h2 id="bento-skills" className={TILE_LABEL}>
                Skills
              </h2>
              <div className="mt-4 space-y-4">
                {skillGroups.map(([category, skills]) => (
                  <div key={category}>
                    <h3 className="text-xs font-medium text-zinc-400 mb-2">{category}</h3>
                    <ul className="flex flex-wrap gap-1.5">
                      {skills.map((skill) => (
                        <li key={skill.id} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-800">
                          {skill.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Experience */}
          {experiences.length > 0 && (
            <section id="experience" aria-labelledby="bento-experience" className={`${TILE_LIGHT} sm:col-span-2 scroll-mt-24`}>
              <h2 id="bento-experience" className={TILE_LABEL}>
                Experience
              </h2>
              <ol className="mt-4 space-y-4">
                {experiences.slice(0, MAX_TIMELINE).map((exp) => (
                  <li key={exp.id} className="flex gap-3 min-w-0">
                    <span aria-hidden="true" className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${exp.isCurrent ? "bg-lime-400 ring-4 ring-lime-100" : "bg-zinc-300"}`} />
                    <div className="min-w-0">
                      <h3 className="font-grotesk font-bold break-words">{exp.position || exp.company}</h3>
                      <p className="text-sm text-zinc-500 break-words">
                        {exp.position && exp.company ? `${exp.company} · ` : ""}
                        {formatDateRange(exp.startDate, exp.endDate, exp.isCurrent)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              {experiences.length > MAX_TIMELINE && (
                <p className="mt-4 text-xs text-zinc-500">+{experiences.length - MAX_TIMELINE} earlier roles</p>
              )}
            </section>
          )}

          {projects.length === 0 && skillGroups.length === 0 && experiences.length === 0 && (
            <section aria-label="Getting started" className={`${TILE} sm:col-span-2 border-2 border-dashed border-zinc-300 text-zinc-500 flex items-center justify-center text-center min-h-[200px]`}>
              <p className="font-grotesk text-lg">Projects, skills and experience will appear here.</p>
            </section>
          )}
        </div>
      </Main>

      <footer className="max-w-6xl mx-auto px-4 pb-8">
        <div className="rounded-3xl bg-white border border-black/5 px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-500 text-center">
          <span>
            © {year} {name}. All rights reserved.
          </span>
          <span>Published with FolioCraft</span>
        </div>
      </footer>
    </div>
  );
}

export default TemplateBento;

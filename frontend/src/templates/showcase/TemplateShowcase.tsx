import React from "react";
import { TemplateProps } from "../types";
import { ProjectTitleLink } from "../site/ProjectTitleLink";
import {
  formatDateRange,
  getInitials,
  getSafeSocialLinks,
  groupProjectsByTechnology,
  groupSkills,
  sortExperiences,
  sortProjects,
} from "../site/siteModel";
import { ExternalLink } from "../shared/ExternalLink";
import { getTemplateMotion, heroItemProps, revealProps } from "../motion/motionConfig";
import {
  ExternalLinkIcon,
  FileTextIcon,
  FolderGit2Icon,
  GithubIcon,
  MailIcon,
  MapPinIcon,
} from "@/components/portfolio/PortfolioIcons";

const motion = getTemplateMotion("showcase");

/**
 * Project Showcase — project-first portfolio (Phase 13).
 *
 * Identity: a repository-style header with tabs, a large spotlight on the
 * featured project, a gallery of repo cards with coloured technology dots, a
 * "Built with" index that groups projects by technology, a README.md-style
 * about card and a commit-log style experience history. Indigo accent on a
 * cool grey canvas with mono metadata.
 */

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6f8fa]";

/** Fixed palette (full class names so Tailwind can detect them). */
const TECH_DOT_COLORS = [
  "bg-indigo-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-orange-500",
  "bg-teal-500",
];

/** Deterministic colour per technology name (case-insensitive). */
export function techDotColor(tech: string): string {
  let hash = 0;
  for (const char of tech.trim().toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TECH_DOT_COLORS[hash % TECH_DOT_COLORS.length];
}

const MAX_CARD_TECH = 4;
const MAX_INDEX_TECH = 10;

function TechDots({ technologies, label }: { technologies: string[]; label: string }) {
  if (technologies.length === 0) return null;
  const shown = technologies.slice(0, MAX_CARD_TECH);
  const hidden = technologies.length - shown.length;
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600" aria-label={label}>
      {shown.map((tech, i) => (
        <li key={`${tech}-${i}`} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={`w-2.5 h-2.5 rounded-full ${techDotColor(tech)}`} />
          {tech}
        </li>
      ))}
      {hidden > 0 && <li className="text-slate-400">+{hidden}</li>}
    </ul>
  );
}

export function TemplateShowcase({
  data,
  className = "",
  siteNav,
  getProjectHref,
}: TemplateProps): React.JSX.Element {
  const year = new Date().getFullYear();
  const projects = sortProjects(data.projects || []);
  const [spotlight, ...gallery] = projects;
  const techIndex = groupProjectsByTechnology(projects).slice(0, MAX_INDEX_TECH);
  const experiences = sortExperiences(data.experiences || []);
  const skillGroups = groupSkills(data.skills || []);
  const socials = getSafeSocialLinks(data.socialLinks);
  const name = data.name || "Portfolio";
  const handle = data.username || "portfolio";
  const Main = siteNav ? "div" : "main";

  const tabs = [
    { href: "#overview", label: "Overview" },
    projects.length > 0 && { href: "#projects", label: "Projects", count: projects.length },
    techIndex.length > 0 && { href: "#stack", label: "Stack" },
    experiences.length > 0 && { href: "#history", label: "History", count: experiences.length },
  ].filter(Boolean) as Array<{ href: string; label: string; count?: number }>;

  return (
    <div
      data-testid="template-showcase"
      className={`template-showcase min-h-screen bg-[#f6f8fa] text-slate-800 font-sans selection:bg-indigo-200 selection:text-indigo-950 overflow-x-clip ${className}`}
    >
      {siteNav ?? (
        <nav aria-label="Project Showcase Navigation" className="bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <p className="pt-4 font-mono text-sm text-slate-500 truncate">
              <span className="text-indigo-600">{handle}</span> / <span className="font-semibold text-slate-900">portfolio</span>
            </p>
            <ul className="mt-3 flex gap-1 overflow-x-auto -mb-px">
              {tabs.map((tab, i) => (
                <li key={tab.href}>
                  <a
                    href={tab.href}
                    className={`inline-flex items-center gap-2 px-3 py-2.5 text-sm border-b-2 whitespace-nowrap ${
                      i === 0 ? "border-indigo-500 text-slate-900 font-semibold" : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
                    } ${FOCUS}`}
                  >
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-[11px] font-mono text-slate-600">{tab.count}</span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      )}

      <Main id={siteNav ? undefined : "main-content"} className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-12 sm:space-y-16">
        {/* Owner strip */}
        <header id="overview" className="flex flex-col sm:flex-row sm:items-center gap-5 scroll-mt-20">
          {data.profileImageUrl ? (
            <img src={data.profileImageUrl} alt={`${name}'s profile photo`} className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border border-slate-200 flex-shrink-0" {...heroItemProps(0)} />
          ) : (
            <span aria-hidden="true" className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-indigo-600 text-white font-mono text-xl font-bold flex items-center justify-center flex-shrink-0" {...heroItemProps(0)}>
              {getInitials(data.name)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 break-words" {...heroItemProps(1)}>{name}</h1>
            {data.title && <p className="mt-1 text-base sm:text-lg text-slate-600 break-words" {...heroItemProps(2)}>{data.title}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500" {...heroItemProps(3)}>
              {data.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPinIcon className="w-4 h-4 flex-shrink-0" />
                  <span className="break-words">{data.location}</span>
                </span>
              )}
              {data.email && (
                <a href={`mailto:${data.email}`} className={`inline-flex items-center gap-1.5 hover:text-indigo-600 break-all rounded-sm ${FOCUS}`}>
                  <MailIcon className="w-4 h-4 flex-shrink-0" />
                  {data.email}
                </a>
              )}
              {data.phone && (
                <a href={`tel:${data.phone}`} className={`hover:text-indigo-600 rounded-sm ${FOCUS}`}>
                  {data.phone}
                </a>
              )}
              {socials.map((link) => (
                <ExternalLink key={link.platform} href={link.href} className={`hover:text-indigo-600 rounded-sm ${FOCUS}`}>
                  {link.label}
                </ExternalLink>
              ))}
            </div>
          </div>
        </header>

        {/* Spotlight */}
        {spotlight && (
          <section id="projects" aria-labelledby="showcase-spotlight" data-testid="showcase-spotlight" className="scroll-mt-20" {...motion.section()}>
            <h2 id="showcase-spotlight" className="mb-4 font-mono text-xs font-semibold uppercase tracking-wider text-indigo-600" {...motion.heading()}>
              ★ Featured project
            </h2>
            <article className="grid grid-cols-1 lg:grid-cols-5 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm" {...motion.item()} {...motion.card()}>
              <div className="lg:col-span-3 aspect-video lg:aspect-auto lg:min-h-[340px] bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 relative overflow-hidden">
                {spotlight.imageUrl ? (
                  <img src={spotlight.imageUrl} alt={`Screenshot of ${spotlight.title}`} className="absolute inset-0 w-full h-full object-cover" {...motion.media()} />
                ) : (
                  <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center font-mono text-6xl sm:text-7xl font-bold text-white/90">
                    {getInitials(spotlight.title)}
                  </span>
                )}
              </div>
              <div className="lg:col-span-2 p-6 sm:p-8 flex flex-col min-w-0">
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 break-words">
                  <ProjectTitleLink project={spotlight} getProjectHref={getProjectHref} className={FOCUS} />
                </h3>
                {spotlight.description && (
                  <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-600 whitespace-pre-line break-words line-clamp-6">{spotlight.description}</p>
                )}
                <div className="mt-5">
                  <TechDots technologies={spotlight.technologies} label={`Technologies used in ${spotlight.title}`} />
                </div>
                <div className="mt-auto pt-6 flex flex-wrap gap-2">
                  <ExternalLink href={spotlight.projectUrl} label={`Live demo of ${spotlight.title}`} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 ${FOCUS}`}>
                    <ExternalLinkIcon className="w-4 h-4" />
                    Live demo
                  </ExternalLink>
                  <ExternalLink href={spotlight.githubUrl} label={`Source code for ${spotlight.title}`} className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm font-semibold hover:bg-slate-50 ${FOCUS}`}>
                    <GithubIcon className="w-4 h-4" />
                    Source
                  </ExternalLink>
                </div>
              </div>
            </article>
          </section>
        )}

        {/* Repo gallery */}
        {gallery.length > 0 && (
          <section id="more-projects" aria-labelledby="showcase-gallery" className="scroll-mt-20" {...motion.section()}>
            <h2 id="showcase-gallery" className="mb-4 text-lg font-bold text-slate-900" {...motion.heading()}>
              More projects <span className="font-mono text-sm font-normal text-slate-400">({gallery.length})</span>
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {gallery.map((project, index) => (
                <li key={project.id} data-testid="showcase-repo-card" className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col min-w-0 hover:border-indigo-300 transition-colors" {...motion.item(index, 3)} {...motion.card()}>
                  <div className="flex items-start gap-2.5">
                    <FolderGit2Icon className="w-4 h-4 mt-1 text-slate-400 flex-shrink-0" />
                    <h3 className="font-semibold text-indigo-700 break-words">
                      <ProjectTitleLink project={project} getProjectHref={getProjectHref} className={FOCUS} />
                    </h3>
                  </div>
                  {project.description ? (
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed line-clamp-3 break-words">{project.description}</p>
                  ) : (
                    <p className="mt-2 text-sm italic text-slate-400">No description provided.</p>
                  )}
                  <div className="mt-auto pt-4 flex flex-wrap items-center justify-between gap-3">
                    <TechDots technologies={project.technologies} label={`Technologies used in ${project.title}`} />
                    <div className="flex items-center gap-1">
                      <ExternalLink href={project.githubUrl} label={`Source code for ${project.title}`} className={`p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 ${FOCUS}`}>
                        <GithubIcon className="w-4 h-4" />
                      </ExternalLink>
                      <ExternalLink href={project.projectUrl} label={`Live demo of ${project.title}`} className={`p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 ${FOCUS}`}>
                        <ExternalLinkIcon className="w-4 h-4" />
                      </ExternalLink>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* README */}
          {(data.about || skillGroups.length > 0) && (
            <section aria-labelledby="showcase-readme" data-testid="showcase-readme" className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden min-w-0" {...revealProps()}>
              <h2 id="showcase-readme" className="flex items-center gap-2 px-5 py-3 border-b border-slate-200 bg-slate-50 font-mono text-sm font-semibold text-slate-700">
                <FileTextIcon className="w-4 h-4 text-slate-400" />
                README.md
              </h2>
              <div className="p-5 sm:p-6 space-y-6">
                {data.about && <p className="text-sm sm:text-base leading-relaxed text-slate-700 whitespace-pre-line break-words">{data.about}</p>}
                {skillGroups.map(([category, skills]) => (
                  <div key={category}>
                    <h3 className="font-mono text-sm font-bold text-slate-900">
                      <span aria-hidden="true" className="text-slate-400">## </span>
                      {category}
                    </h3>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {skills.map((skill) => (
                        <li key={skill.id} className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-mono">
                          {skill.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Built with index */}
          {techIndex.length > 0 && (
            <section id="stack" aria-labelledby="showcase-stack" data-testid="showcase-tech-index" className="min-w-0 scroll-mt-20" {...revealProps(1)}>
              <h2 id="showcase-stack" className="mb-4 text-lg font-bold text-slate-900">
                Built with
              </h2>
              <ul className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
                {techIndex.map(([tech, list]) => (
                  <li key={tech} className="px-4 py-3">
                    <p className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-800">
                      <span className="inline-flex items-center gap-2 min-w-0">
                        <span aria-hidden="true" className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${techDotColor(tech)}`} />
                        <span className="truncate">{tech}</span>
                      </span>
                      <span className="font-mono text-xs text-slate-400 flex-shrink-0">
                        {list.length} {list.length === 1 ? "project" : "projects"}
                      </span>
                    </p>
                    <p className="mt-1 pl-[18px] text-xs text-slate-500 break-words">
                      {list.map((p, i) => (
                        <React.Fragment key={p.id}>
                          {i > 0 && ", "}
                          {p.title}
                        </React.Fragment>
                      ))}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Commit-log history */}
        {experiences.length > 0 && (
          <section id="history" aria-labelledby="showcase-history" className="scroll-mt-20" {...motion.section()}>
            <h2 id="showcase-history" className="mb-4 text-lg font-bold text-slate-900" {...motion.heading()}>
              Contribution history
            </h2>
            <ol className="relative border-l-2 border-slate-200 ml-2 space-y-6">
              {experiences.map((exp) => (
                <li key={exp.id} className="relative pl-6 min-w-0" {...motion.item()}>
                  <span aria-hidden="true" className={`absolute -left-[7px] top-1.5 w-3 h-3 rounded-full ring-4 ring-[#f6f8fa] ${exp.isCurrent ? "bg-indigo-500" : "bg-slate-400"}`} />
                  <p className="font-mono text-xs text-slate-500">{formatDateRange(exp.startDate, exp.endDate, exp.isCurrent)}</p>
                  <h3 className="mt-1 font-semibold text-slate-900 break-words">
                    {exp.position || exp.company}
                    {exp.position && exp.company && <span className="font-normal text-slate-500"> @ {exp.company}</span>}
                    {exp.isCurrent && (
                      <span className="ml-2 align-middle px-2 py-0.5 rounded-full border border-indigo-200 bg-indigo-50 text-[10px] font-semibold text-indigo-700">
                        Current
                      </span>
                    )}
                  </h3>
                  {exp.description && <p className="mt-1.5 text-sm text-slate-600 leading-relaxed whitespace-pre-line break-words max-w-3xl">{exp.description}</p>}
                </li>
              ))}
            </ol>
          </section>
        )}

        {projects.length === 0 && (
          <section aria-label="No projects" className="border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center">
            <FolderGit2Icon className="w-8 h-8 mx-auto text-slate-300" />
            <p className="mt-3 text-slate-500">No projects have been published yet.</p>
          </section>
        )}
      </Main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 text-center">
          <span>
            © {year} {name}. All rights reserved.
          </span>
          <span>Published with FolioCraft</span>
        </div>
      </footer>
    </div>
  );
}

export default TemplateShowcase;

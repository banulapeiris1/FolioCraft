import React from "react";
import { TemplateProps } from "../types";
import { ProjectTitleLink } from "../site/ProjectTitleLink";
import {
  formatDateRange,
  getSafeSocialLinks,
  groupSkills,
  sortExperiences,
  sortProjects,
} from "../site/siteModel";
import { ExternalLink } from "../shared/ExternalLink";
import { getTemplateMotion, heroItemProps } from "../motion/motionConfig";

/**
 * Editorial — magazine-style portfolio (Phase 13).
 *
 * Identity: warm paper background, oversized Fraunces display type, a masthead
 * with double rules, numbered section openers, a drop-cap introduction set in
 * two columns, and a ruled "contents" index of work instead of cards.
 */

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a2c0d] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6f1e7]";

const PULL_QUOTE_MIN_LENGTH = 280;

const motion = getTemplateMotion("editorial");

function SectionOpener({ number, id, children }: { number: string; id: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-4 sm:gap-6 border-t-2 border-[#1c1917] pt-4 mb-8 sm:mb-12" {...motion.heading()}>
      <span aria-hidden="true" className="font-display-serif text-sm sm:text-base italic text-[#8a2c0d]">
        {number}
      </span>
      <h2
        id={id}
        className="font-display-serif text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-[#1c1917]"
      >
        {children}
      </h2>
    </div>
  );
}

/** First sentence of the introduction, used as a pull quote for long texts. */
function firstSentence(text: string): string {
  const match = text.trim().match(/^[\s\S]*?[.!?](?=\s|$)/);
  return (match ? match[0] : text).trim();
}

export function TemplateEditorial({
  data,
  className = "",
  siteNav,
  getProjectHref,
}: TemplateProps): React.JSX.Element {
  const year = new Date().getFullYear();
  const projects = sortProjects(data.projects || []);
  const experiences = sortExperiences(data.experiences || []);
  const skillGroups = groupSkills(data.skills || []);
  const socials = getSafeSocialLinks(data.socialLinks);
  const name = data.name || "Portfolio";
  const about = (data.about || "").trim();
  // Public pages already wrap templates in <main>; avoid nesting landmarks.
  const Main = siteNav ? "div" : "main";
  const pullQuote = about.length >= PULL_QUOTE_MIN_LENGTH ? firstSentence(about) : null;

  // Number only the sections that are present, in reading order.
  const sections = [
    about && { key: "about", label: "Introduction" },
    projects.length > 0 && { key: "work", label: "Selected Work" },
    experiences.length > 0 && { key: "experience", label: "Career" },
    skillGroups.length > 0 && { key: "skills", label: "Expertise" },
  ].filter(Boolean) as Array<{ key: string; label: string }>;
  const numberOf = (key: string) => String(sections.findIndex((s) => s.key === key) + 1).padStart(2, "0");

  return (
    <div
      data-testid="template-editorial"
      className={`template-editorial @container min-h-screen bg-[#f6f1e7] text-[#1c1917] font-text-serif selection:bg-[#8a2c0d] selection:text-[#f6f1e7] overflow-x-clip ${className}`}
    >
      {siteNav}

      <div className="max-w-6xl mx-auto px-4 sm:px-8">
        {/* Masthead */}
        <header className="pt-8 sm:pt-12">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-y border-[#1c1917] py-2 text-[11px] sm:text-xs font-sans uppercase tracking-[0.2em]" {...heroItemProps(0)}>
            <span>Portfolio</span>
            {data.location && <span className="hidden sm:inline break-words">{data.location}</span>}
            <span>{year}</span>
          </div>

          {!siteNav && sections.length > 0 && (
            <nav aria-label="Editorial Portfolio Navigation" className="border-b border-[#1c1917] py-2.5">
              <ul className="flex flex-wrap justify-center gap-x-6 sm:gap-x-10 gap-y-1 font-sans text-xs uppercase tracking-[0.18em]">
                {sections.map((section) => (
                  <li key={section.key}>
                    <a href={`#${section.key}`} className={`hover:text-[#8a2c0d] transition-colors rounded-sm ${FOCUS}`}>
                      {section.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10 py-12 sm:py-16 md:py-20 items-end">
            <div className={`min-w-0 ${data.profileImageUrl ? "md:col-span-8" : "md:col-span-12"}`}>
              <h1 className="font-display-serif font-semibold tracking-tight leading-[0.92] text-5xl @2xl:text-7xl @5xl:text-8xl break-words" {...heroItemProps(1)}>
                {name}
              </h1>
              {data.title && (
                <p className="mt-6 font-display-serif italic text-xl sm:text-2xl md:text-3xl text-[#57534e] break-words" {...heroItemProps(2)}>
                  {data.title}
                </p>
              )}
            </div>
            {data.profileImageUrl && (
              <figure className="md:col-span-4 min-w-0" {...heroItemProps(2)}>
                <img
                  src={data.profileImageUrl}
                  alt={`${name}'s profile photo`}
                  className="w-full max-w-xs md:max-w-none aspect-[4/5] object-cover grayscale contrast-110 border border-[#1c1917]"
                />
                <figcaption className="mt-2 font-sans text-[11px] uppercase tracking-[0.18em] text-[#57534e]">
                  Portrait — {name}
                </figcaption>
              </figure>
            )}
          </div>
        </header>

        <Main id={siteNav ? undefined : "main-content"} className="pb-16 sm:pb-24 space-y-20 sm:space-y-28">
          {/* Introduction */}
          {about && (
            <section id="about" aria-labelledby="editorial-about-heading" className="scroll-mt-20" {...motion.section()}>
              <SectionOpener number={numberOf("about")} id="editorial-about-heading">
                Introduction
              </SectionOpener>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10" {...motion.item()}>
                <p
                  data-testid="editorial-intro"
                  className={`${pullQuote ? "lg:col-span-8" : "lg:col-span-12"} md:columns-2 gap-10 text-base sm:text-lg leading-relaxed whitespace-pre-line break-words first-letter:float-left first-letter:font-display-serif first-letter:text-7xl first-letter:leading-[0.8] first-letter:mr-3 first-letter:mt-1 first-letter:text-[#8a2c0d]`}
                >
                  {about}
                </p>
                {pullQuote && (
                  <blockquote className="lg:col-span-4 border-l-4 border-[#8a2c0d] pl-5 self-start">
                    <p className="font-display-serif italic text-2xl sm:text-3xl leading-snug break-words">“{pullQuote}”</p>
                  </blockquote>
                )}
              </div>
            </section>
          )}

          {/* Selected Work — ruled contents index */}
          {projects.length > 0 && (
            <section id="work" aria-labelledby="editorial-work-heading" className="scroll-mt-20" {...motion.section()}>
              <SectionOpener number={numberOf("work")} id="editorial-work-heading">
                Selected Work
              </SectionOpener>
              <ol className="divide-y divide-[#1c1917]/25 border-b border-[#1c1917]/25">
                {projects.map((project, index) => (
                  <li
                    key={project.id}
                    data-testid="editorial-work-item"
                    className="grid grid-cols-12 gap-4 sm:gap-8 py-8 sm:py-10"
                    {...motion.item()}
                  >
                    <span
                      aria-hidden="true"
                      className="col-span-2 sm:col-span-1 font-display-serif text-3xl sm:text-4xl text-[#8a2c0d] leading-none"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <article className={`col-span-10 min-w-0 ${project.imageUrl ? "sm:col-span-7" : "sm:col-span-11"}`}>
                      <h3 className="font-display-serif text-2xl sm:text-3xl font-medium tracking-tight break-words">
                        <ProjectTitleLink project={project} getProjectHref={getProjectHref} className={FOCUS} />
                      </h3>
                      {project.description && (
                        <p className="mt-3 text-base leading-relaxed text-[#44403c] whitespace-pre-line break-words max-w-prose">
                          {project.description}
                        </p>
                      )}
                      {project.technologies.length > 0 && (
                        <p className="mt-4 font-sans text-xs uppercase tracking-[0.16em] text-[#57534e] break-words">
                          <span className="text-[#8a2c0d]">Built with</span> {project.technologies.join(" · ")}
                        </p>
                      )}
                      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 font-sans text-sm">
                        <ExternalLink
                          href={project.projectUrl}
                          label={`Visit ${project.title}`}
                          className={`underline underline-offset-4 decoration-[#8a2c0d] hover:text-[#8a2c0d] rounded-sm ${FOCUS}`}
                        >
                          Visit ↗
                        </ExternalLink>
                        <ExternalLink
                          href={project.githubUrl}
                          label={`Source code for ${project.title}`}
                          className={`underline underline-offset-4 decoration-[#8a2c0d] hover:text-[#8a2c0d] rounded-sm ${FOCUS}`}
                        >
                          Source ↗
                        </ExternalLink>
                      </div>
                    </article>
                    {project.imageUrl && (
                      <div className="col-span-12 sm:col-span-4 min-w-0">
                        <img
                          src={project.imageUrl}
                          alt={`Screenshot of ${project.title}`}
                          loading="lazy"
                          className="w-full aspect-[4/3] object-cover grayscale hover:grayscale-0 transition duration-500 border border-[#1c1917]"
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Career */}
          {experiences.length > 0 && (
            <section id="experience" aria-labelledby="editorial-experience-heading" className="scroll-mt-20" {...motion.section()}>
              <SectionOpener number={numberOf("experience")} id="editorial-experience-heading">
                Career
              </SectionOpener>
              <div className="space-y-10">
                {experiences.map((exp) => (
                  <article key={exp.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-8" {...motion.item()}>
                    <p className="sm:col-span-3 font-sans text-xs uppercase tracking-[0.16em] text-[#57534e] pt-2">
                      {formatDateRange(exp.startDate, exp.endDate, exp.isCurrent)}
                    </p>
                    <div className="sm:col-span-9 min-w-0">
                      <h3 className="font-display-serif text-2xl sm:text-3xl font-medium break-words">
                        {exp.position || exp.company}
                      </h3>
                      {exp.position && exp.company && (
                        <p className="font-display-serif italic text-lg text-[#8a2c0d] break-words">{exp.company}</p>
                      )}
                      {exp.description && (
                        <p className="mt-3 text-base leading-relaxed text-[#44403c] whitespace-pre-line break-words max-w-prose">
                          {exp.description}
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* Expertise */}
          {skillGroups.length > 0 && (
            <section id="skills" aria-labelledby="editorial-skills-heading" className="scroll-mt-20" {...motion.section()}>
              <SectionOpener number={numberOf("skills")} id="editorial-skills-heading">
                Expertise
              </SectionOpener>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                {skillGroups.map(([category, skills], index) => (
                  <div key={category} className="min-w-0 border-t border-[#1c1917]/25 pt-4" {...motion.item(index, 2)}>
                    <dt className="font-sans text-xs uppercase tracking-[0.18em] text-[#8a2c0d]">{category}</dt>
                    <dd className="mt-2 font-display-serif text-xl sm:text-2xl leading-snug break-words">
                      {skills.map((skill) => skill.name).join(" / ")}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {!about && projects.length === 0 && experiences.length === 0 && skillGroups.length === 0 && (
            <p className="font-display-serif italic text-2xl text-[#57534e] border-t-2 border-[#1c1917] pt-6">
              This edition is still being written.
            </p>
          )}
        </Main>
      </div>

      {/* Colophon / correspondence */}
      <footer className="bg-[#1c1917] text-[#f6f1e7]">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12 sm:py-16 grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-7 min-w-0">
            <h2 className="font-display-serif text-3xl sm:text-4xl italic">Correspondence</h2>
            <address className="not-italic mt-5 space-y-2 font-sans text-sm">
              {data.email && (
                <p>
                  <a href={`mailto:${data.email}`} className={`underline underline-offset-4 decoration-[#f6f1e7]/40 hover:decoration-[#f6f1e7] break-all rounded-sm ${FOCUS}`}>
                    {data.email}
                  </a>
                </p>
              )}
              {data.phone && (
                <p>
                  <a href={`tel:${data.phone}`} className={`hover:underline underline-offset-4 rounded-sm ${FOCUS}`}>
                    {data.phone}
                  </a>
                </p>
              )}
              {data.location && <p className="text-[#f6f1e7]/70 break-words">{data.location}</p>}
              {!data.email && !data.phone && !data.location && <p className="text-[#f6f1e7]/70">Contact details have not been shared.</p>}
            </address>
          </div>
          {socials.length > 0 && (
            <ul className="md:col-span-5 flex flex-wrap md:justify-end content-start gap-x-6 gap-y-2 font-sans text-xs uppercase tracking-[0.18em]">
              {socials.map((link) => (
                <li key={link.platform}>
                  <ExternalLink href={link.href} className={`hover:text-[#f3b49c] transition-colors rounded-sm ${FOCUS}`}>
                    {link.label}
                  </ExternalLink>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-[#f6f1e7]/15">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 font-sans text-[11px] uppercase tracking-[0.18em] text-[#f6f1e7]/60 text-center">
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

export default TemplateEditorial;

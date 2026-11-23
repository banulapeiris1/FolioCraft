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

// Readable CV: whole sections fade in; capped at "subtle" by resolveMotionMode.
const motion = getTemplateMotion("academic");

/**
 * Academic CV — curriculum-vitae style portfolio (Phase 13).
 *
 * Identity: a centred, typeset CV header with a single contact line, then
 * rows with small-caps section labels in a left rail. Work is listed as
 * numbered, bibliography-style entries ([1], [2] …) with bracketed links.
 * Entirely Source Serif on white with a maroon accent.
 *
 * Content comes only from the existing portfolio model (profile, skills,
 * experience, projects). Education and publications are not stored by the
 * platform, so no such sections are rendered or invented.
 */

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7a1f2b] focus-visible:ring-offset-2";

function CvSection({
  id,
  label,
  children,
  testId,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      data-testid={testId}
      className="grid grid-cols-1 sm:grid-cols-[10rem_minmax(0,1fr)] md:grid-cols-[12rem_minmax(0,1fr)] gap-2 sm:gap-8 py-8 border-t border-[#e6e1d8] scroll-mt-20"
      {...motion.section()}
    >
      <h2
        id={`${id}-heading`}
        className="text-sm font-semibold uppercase tracking-[0.14em] text-[#7a1f2b] sm:pt-0.5"
      >
        {label}
      </h2>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function TemplateAcademic({
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
  const Main = siteNav ? "div" : "main";

  const contactItems: React.ReactNode[] = [];
  if (data.location) contactItems.push(<span key="loc" className="break-words">{data.location}</span>);
  if (data.email)
    contactItems.push(
      <a key="email" href={`mailto:${data.email}`} className={`hover:text-[#7a1f2b] underline-offset-4 hover:underline break-all rounded-sm ${FOCUS}`}>
        {data.email}
      </a>
    );
  if (data.phone)
    contactItems.push(
      <a key="phone" href={`tel:${data.phone}`} className={`hover:text-[#7a1f2b] rounded-sm ${FOCUS}`}>
        {data.phone}
      </a>
    );
  for (const link of socials) {
    contactItems.push(
      <ExternalLink key={link.platform} href={link.href} className={`hover:text-[#7a1f2b] underline-offset-4 hover:underline rounded-sm ${FOCUS}`}>
        {link.label}
      </ExternalLink>
    );
  }

  const anchors = [
    data.about && { href: "#profile", label: "Profile" },
    skillGroups.length > 0 && { href: "#expertise", label: "Expertise" },
    experiences.length > 0 && { href: "#positions", label: "Positions" },
    projects.length > 0 && { href: "#selected-work", label: "Selected Work" },
  ].filter(Boolean) as Array<{ href: string; label: string }>;

  return (
    <div
      data-testid="template-academic"
      className={`template-academic min-h-screen bg-[#fdfcf9] text-[#2a2522] font-text-serif selection:bg-[#7a1f2b]/15 overflow-x-clip ${className}`}
    >
      {siteNav ??
        (anchors.length > 0 && (
          <nav aria-label="Academic Portfolio Navigation" className="border-b border-[#e6e1d8]">
            <ul className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm">
              {anchors.map((anchor) => (
                <li key={anchor.href}>
                  <a href={anchor.href} className={`text-[#5c534d] hover:text-[#7a1f2b] rounded-sm ${FOCUS}`}>
                    {anchor.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* CV header */}
        <header className="text-center pb-8">
          {data.profileImageUrl && (
            <img
              src={data.profileImageUrl}
              alt={`${name}'s profile photo`}
              className="mx-auto mb-6 w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border border-[#e6e1d8]"
              {...heroItemProps(0)}
            />
          )}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-[#1d1917] break-words" {...heroItemProps(1)}>{name}</h1>
          {data.title && <p className="mt-2 text-lg sm:text-xl italic text-[#5c534d] break-words" {...heroItemProps(2)}>{data.title}</p>}
          {contactItems.length > 0 && (
            <address
              data-testid="academic-contact-line"
              className="not-italic mt-5 flex flex-wrap justify-center items-center gap-x-2 gap-y-1 text-sm text-[#5c534d]"
              {...heroItemProps(3)}
            >
              {contactItems.map((item, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <span aria-hidden="true" className="text-[#b9aea4]">·</span>}
                  {item}
                </React.Fragment>
              ))}
            </address>
          )}
          <div aria-hidden="true" className="mt-8 mx-auto h-0.5 w-24 bg-[#7a1f2b]" />
        </header>

        <Main id={siteNav ? undefined : "main-content"}>
          {data.about && (
            <CvSection id="profile" label="Profile">
              <p className="text-base sm:text-[17px] leading-relaxed whitespace-pre-line break-words sm:text-justify hyphens-auto">
                {data.about}
              </p>
            </CvSection>
          )}

          {skillGroups.length > 0 && (
            <CvSection id="expertise" label="Expertise" testId="academic-expertise">
              <dl className="space-y-2.5">
                {skillGroups.map(([category, skills]) => (
                  <div key={category} className="sm:flex sm:gap-2">
                    <dt className="font-semibold flex-shrink-0">{category}:</dt>
                    <dd className="text-[#4a423d] break-words">{skills.map((skill) => skill.name).join(", ")}</dd>
                  </div>
                ))}
              </dl>
            </CvSection>
          )}

          {experiences.length > 0 && (
            <CvSection id="positions" label="Positions">
              <ul className="space-y-6">
                {experiences.map((exp) => (
                  <li key={exp.id} className="min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-x-6 gap-y-0.5">
                      <h3 className="text-lg font-semibold text-[#1d1917] break-words">{exp.position || exp.company}</h3>
                      <p className="text-sm text-[#5c534d] tabular-nums flex-shrink-0">
                        {formatDateRange(exp.startDate, exp.endDate, exp.isCurrent)}
                      </p>
                    </div>
                    {exp.position && exp.company && <p className="italic text-[#7a1f2b] break-words">{exp.company}</p>}
                    {exp.description && (
                      <p className="mt-2 text-[15px] leading-relaxed text-[#4a423d] whitespace-pre-line break-words">
                        {exp.description}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </CvSection>
          )}

          {projects.length > 0 && (
            <CvSection id="selected-work" label="Selected Work" testId="academic-selected-work">
              <ol className="space-y-5">
                {projects.map((project, index) => (
                  <li key={project.id} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-2" data-testid="academic-work-entry">
                    <span aria-hidden="true" className="text-[#7a1f2b] tabular-nums">[{index + 1}]</span>
                    <div className="min-w-0 text-[15px] leading-relaxed">
                      <span className="font-semibold text-[#1d1917] text-base">
                        <ProjectTitleLink project={project} getProjectHref={getProjectHref} className={FOCUS} />
                      </span>
                      {". "}
                      {project.description && <span className="text-[#4a423d] break-words">{project.description} </span>}
                      {project.technologies.length > 0 && (
                        <em className="text-[#5c534d] break-words">{project.technologies.join(", ")}. </em>
                      )}
                      <span className="inline-flex flex-wrap gap-x-2 text-sm">
                        <ExternalLink href={project.githubUrl} label={`Code for ${project.title}`} className={`text-[#7a1f2b] hover:underline underline-offset-4 rounded-sm ${FOCUS}`}>
                          [code]
                        </ExternalLink>
                        <ExternalLink href={project.projectUrl} label={`${project.title} online`} className={`text-[#7a1f2b] hover:underline underline-offset-4 rounded-sm ${FOCUS}`}>
                          [online]
                        </ExternalLink>
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </CvSection>
          )}

          {!data.about && skillGroups.length === 0 && experiences.length === 0 && projects.length === 0 && (
            <p className="py-8 border-t border-[#e6e1d8] text-center italic text-[#5c534d]">
              This curriculum vitae has not been filled in yet.
            </p>
          )}
        </Main>

        <footer className="mt-4 pt-6 border-t border-[#e6e1d8] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#8a7f77] text-center">
          <span>
            © {year} {name}. All rights reserved.
          </span>
          <span>Published with FolioCraft</span>
        </footer>
      </div>
    </div>
  );
}

export default TemplateAcademic;

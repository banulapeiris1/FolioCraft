import React from "react";
import Link from "next/link";
import type { PortfolioViewData } from "../types";
import { groupSkills, portfolioPaths, safeExternalUrl } from "./siteModel";
import { getSiteTheme } from "./siteThemes";
import { EmptyState, PageHeader, SectionHeading } from "./SitePrimitives";
import {
  ArrowRightIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
} from "@/components/portfolio/PortfolioIcons";

export interface AboutViewProps {
  data: PortfolioViewData;
  username: string;
}

function platformLabel(key: string): string {
  const normalized = key.trim();
  if (normalized.toLowerCase() === "linkedin") return "LinkedIn";
  if (normalized.toLowerCase() === "github") return "GitHub";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

/**
 * About page content (Phase 12): professional introduction, skills and
 * contact details, all taken from the existing portfolio profile data.
 */
export function AboutView({ data, username }: AboutViewProps): React.JSX.Element {
  const theme = getSiteTheme(data.template);
  const paths = portfolioPaths(username);
  const skillGroups = groupSkills(data.skills);
  const socialLinks = Object.entries(data.socialLinks || {})
    .map(([platform, url]) => ({ platform, href: safeExternalUrl(url) }))
    .filter((link): link is { platform: string; href: string } => link.href !== null);
  const hasContact = Boolean(data.email || data.phone || socialLinks.length > 0);
  const name = data.name || "This developer";

  return (
    <div data-testid="about-page" className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12">
      <div className={`${theme.mainColumn} min-w-0 space-y-12`}>
        <PageHeader theme={theme} eyebrow="About" title={data.name || "About"} subtitle={data.title || undefined}>
          {data.location && (
            <p className={`${theme.muted} inline-flex items-center gap-1.5`}>
              <MapPinIcon className="w-4 h-4 flex-shrink-0" />
              <span className="break-words">{data.location}</span>
            </p>
          )}
        </PageHeader>

        <section aria-labelledby="about-introduction">
          <SectionHeading theme={theme} id="about-introduction">
            Introduction
          </SectionHeading>
          {data.about ? (
            <p data-testid="about-introduction-text" className={`${theme.body} whitespace-pre-line break-words max-w-prose`}>
              {data.about}
            </p>
          ) : (
            <EmptyState
              theme={theme}
              testId="about-empty"
              title="Introduction coming soon"
              message={`${name} hasn't written an introduction yet.`}
            />
          )}
        </section>

        {skillGroups.length > 0 && (
          <section aria-labelledby="about-skills" data-testid="about-skills">
            <SectionHeading theme={theme} id="about-skills">
              Skills
            </SectionHeading>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {skillGroups.map(([category, skills]) => (
                <div key={category} className="space-y-3 min-w-0">
                  <h3 className={theme.eyebrow}>{category}</h3>
                  <ul className="flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <li key={skill.id} className={theme.chip}>
                        {skill.name}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <aside
        aria-label="Profile and contact"
        className={`${theme.sideColumn} min-w-0`}
      >
        <div className={`${theme.card} p-6 space-y-6 lg:sticky lg:top-24`}>
          {data.profileImageUrl && (
            <img
              src={data.profileImageUrl}
              alt={`${name}'s profile photo`}
              className="w-24 h-24 rounded-2xl object-cover"
            />
          )}

          {hasContact ? (
            <div className="space-y-3" data-testid="about-contact">
              <h2 className={theme.cardTitle}>Get in touch</h2>
              <ul className="space-y-2">
                {data.email && (
                  <li>
                    <a
                      href={`mailto:${data.email}`}
                      className={`inline-flex items-center gap-2 break-all ${theme.textLink} ${theme.focusRing}`}
                    >
                      <MailIcon className="w-4 h-4 flex-shrink-0" />
                      {data.email}
                    </a>
                  </li>
                )}
                {data.phone && (
                  <li>
                    <a
                      href={`tel:${data.phone}`}
                      className={`inline-flex items-center gap-2 ${theme.textLink} ${theme.focusRing}`}
                    >
                      <PhoneIcon className="w-4 h-4 flex-shrink-0" />
                      {data.phone}
                    </a>
                  </li>
                )}
              </ul>
              {socialLinks.length > 0 && (
                <ul className="flex flex-wrap gap-2 pt-1">
                  {socialLinks.map((link) => (
                    <li key={link.platform}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className={`${theme.chip} inline-block hover:opacity-80 ${theme.focusRing}`}
                      >
                        {platformLabel(link.platform)}
                        <span className="sr-only"> (opens in new tab)</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p className={theme.muted}>Contact details have not been shared.</p>
          )}

          {(data.projects.length > 0 || data.experiences.length > 0) && (
            <ul className={`space-y-2 pt-4 border-t ${theme.divider}`}>
              {data.projects.length > 0 && (
                <li>
                  <Link href={paths.projects} className={`inline-flex items-center gap-1.5 ${theme.textLink} ${theme.focusRing}`}>
                    View projects
                    <ArrowRightIcon className="w-4 h-4" />
                  </Link>
                </li>
              )}
              {data.experiences.length > 0 && (
                <li>
                  <Link href={paths.experience} className={`inline-flex items-center gap-1.5 ${theme.textLink} ${theme.focusRing}`}>
                    View experience
                    <ArrowRightIcon className="w-4 h-4" />
                  </Link>
                </li>
              )}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}

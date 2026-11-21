import React from "react";
import Link from "next/link";
import type { PortfolioViewData } from "../types";
import { getSiteNavItems, portfolioPaths, type SitePageKey } from "./siteModel";
import { getSiteTheme } from "./siteThemes";
import { BriefcaseIcon, CodeIcon, MenuIcon } from "@/components/portfolio/PortfolioIcons";

export interface SiteNavProps {
  data: PortfolioViewData;
  username: string;
  /** Page currently being viewed; highlighted with aria-current="page". */
  current: SitePageKey;
}

/**
 * Multi-page portfolio navigation (Phase 12).
 *
 * - Server component: active state comes from the route, not usePathname().
 * - Desktop: inline links. Mobile: a native <details> disclosure menu, which
 *   works without client JavaScript and is keyboard accessible by default.
 * - Styled per template via SiteTheme so it matches the owner's template.
 */
export function SiteNav({ data, username, current }: SiteNavProps): React.JSX.Element {
  const theme = getSiteTheme(data.template);
  const items = getSiteNavItems(data, username, current);
  const paths = portfolioPaths(username);

  const brandLabel =
    theme.id === "modern" ? `~/${username}` : data.name || "Portfolio";
  const brandIcon =
    theme.id === "modern" ? (
      <CodeIcon className={theme.brandMark} />
    ) : theme.id === "professional" ? (
      <BriefcaseIcon className={theme.brandMark} />
    ) : null;

  return (
    <nav aria-label="Portfolio" data-testid="portfolio-site-nav" className={theme.nav}>
      <div className={theme.navInner}>
        <Link href={paths.home} className={`${theme.brand} ${theme.focusRing}`}>
          {brandIcon}
          <span className="truncate">{brandLabel}</span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-6">
          <ul className="hidden sm:flex items-center gap-6" data-testid="portfolio-site-nav-desktop">
            {items.map((item) => {
              const active = item.key === current;
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`${active ? theme.navLinkActive : theme.navLink} ${theme.focusRing}`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          {data.email && (
            <a
              href={`mailto:${data.email}`}
              className={`hidden md:inline-flex ${theme.navCta} ${theme.focusRing}`}
            >
              Contact
            </a>
          )}

          {/* Keyed by page so the menu starts closed after each navigation. */}
          <details key={current} className="relative sm:hidden" data-testid="portfolio-site-nav-mobile">
            <summary
              className={`${theme.mobileToggle} ${theme.focusRing} [&::-webkit-details-marker]:hidden`}
              aria-label="Open portfolio menu"
            >
              <MenuIcon className="w-5 h-5" />
            </summary>
            <ul className={theme.mobilePanel}>
              {items.map((item) => {
                const active = item.key === current;
                return (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`block ${active ? theme.mobileLinkActive : theme.mobileLink} ${theme.focusRing}`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
              {data.email && (
                <li>
                  <a
                    href={`mailto:${data.email}`}
                    className={`block ${theme.mobileLink} ${theme.focusRing}`}
                  >
                    Contact
                  </a>
                </li>
              )}
            </ul>
          </details>
        </div>
      </div>
    </nav>
  );
}

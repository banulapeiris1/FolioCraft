import React from "react";
import type { PortfolioViewData } from "../types";
import type { SitePageKey } from "./siteModel";
import { getSiteTheme } from "./siteThemes";
import { SiteNav } from "./SiteNav";

export interface PortfolioSiteShellProps {
  data: PortfolioViewData;
  username: string;
  current: SitePageKey;
  children?: React.ReactNode;
}

/**
 * Shared frame for the secondary public portfolio pages (Phase 12):
 * themed page root, site navigation, content container and footer.
 *
 * The home page does not use this shell; it renders the owner's full template
 * and passes <SiteNav> into it via the template's `siteNav` prop.
 */
export function PortfolioSiteShell({
  data,
  username,
  current,
  children,
}: PortfolioSiteShellProps): React.JSX.Element {
  const theme = getSiteTheme(data.template);
  const year = new Date().getFullYear();

  return (
    <div
      data-testid="portfolio-site"
      data-template={theme.id}
      data-page={current}
      className={theme.root}
    >
      <SiteNav data={data} username={username} current={current} />
      <main id="main-content" className={`${theme.container} py-10 sm:py-16 lg:py-20`}>
        {children}
      </main>
      <footer className={theme.footer}>
        <div
          className={`${theme.container} py-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-center`}
        >
          <span>
            © {year} {data.name || "Portfolio"}. All rights reserved.
          </span>
          <span>Published with FolioCraft</span>
        </div>
      </footer>
    </div>
  );
}

import React from "react";
import { safeExternalUrl } from "../site/siteModel";

export interface ExternalLinkProps {
  /** Raw user-supplied URL; rendered only when it can be made a safe http(s) URL. */
  href?: string | null;
  className?: string;
  /** Accessible name; " (opens in new tab)" is appended automatically. */
  label?: string;
  children: React.ReactNode;
}

/**
 * External link shared by the Phase 13 templates: sanitizes the URL
 * (javascript:/data: schemes are dropped, bare domains get https://), opens in
 * a new tab with rel="noreferrer noopener", and announces that to screen readers.
 * Renders nothing when the URL is missing or unsafe.
 */
export function ExternalLink({ href, className = "", label, children }: ExternalLinkProps): React.JSX.Element | null {
  const safe = safeExternalUrl(href);
  if (!safe) return null;
  return (
    <a
      href={safe}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={label ? `${label} (opens in new tab)` : undefined}
      className={className}
    >
      {children}
      {!label && <span className="sr-only"> (opens in new tab)</span>}
    </a>
  );
}

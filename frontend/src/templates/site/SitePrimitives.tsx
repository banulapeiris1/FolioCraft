import React from "react";
import Link from "next/link";
import type { SiteTheme } from "./siteThemes";

/**
 * Small presentational building blocks shared by the secondary portfolio
 * pages (Phase 12). Every block takes the active SiteTheme so it inherits the
 * owner's template styling.
 */

export interface PageHeaderProps {
  theme: SiteTheme;
  eyebrow?: string;
  title: string;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
}

export function PageHeader({ theme, eyebrow, title, subtitle, children }: PageHeaderProps): React.JSX.Element {
  return (
    <header className="space-y-3 mb-10 sm:mb-14">
      {eyebrow && <p className={theme.eyebrow}>{eyebrow}</p>}
      <h1 className={theme.pageTitle}>{title}</h1>
      {subtitle && <p className={`${theme.pageSubtitle} max-w-2xl`}>{subtitle}</p>}
      {children}
    </header>
  );
}

export interface EmptyStateProps {
  theme: SiteTheme;
  title: string;
  message: string;
  action?: { href: string; label: string };
  testId?: string;
}

export function EmptyState({ theme, title, message, action, testId }: EmptyStateProps): React.JSX.Element {
  return (
    <div
      data-testid={testId}
      className={`${theme.card} px-6 py-12 sm:py-16 text-center flex flex-col items-center gap-3`}
    >
      <h2 className={theme.cardTitle}>{title}</h2>
      <p className={`${theme.muted} max-w-md`}>{message}</p>
      {action && (
        <Link href={action.href} className={`mt-3 ${theme.secondaryButton} ${theme.focusRing}`}>
          {action.label}
        </Link>
      )}
    </div>
  );
}

export interface SectionHeadingProps {
  theme: SiteTheme;
  id: string;
  children: React.ReactNode;
}

export function SectionHeading({ theme, id, children }: SectionHeadingProps): React.JSX.Element {
  return (
    <h2 id={id} className={`${theme.sectionTitle} mb-6`}>
      {children}
    </h2>
  );
}

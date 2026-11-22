import type { PortfolioTemplateId } from "@/types/portfolio";
import { getTemplateDefinition } from "../registry";

/**
 * Visual tokens for the multi-page portfolio, one set per template (Phase 12).
 *
 * The secondary pages (About, Projects, Project detail, Experience) are built
 * from shared components; these tokens make each one look like part of the
 * template the owner picked. Values mirror the classes used inside
 * TemplateModern / TemplateMinimal / TemplateProfessional. Class names are
 * written out in full so Tailwind can detect them.
 */
export interface SiteTheme {
  id: PortfolioTemplateId;
  /** Page root: background, text colour, selection colour. */
  root: string;
  /** Content width + horizontal gutters for <main>. */
  container: string;
  focusRing: string;

  // Navigation
  nav: string;
  navInner: string;
  brand: string;
  brandMark: string;
  navLink: string;
  navLinkActive: string;
  navCta: string;
  mobileToggle: string;
  mobilePanel: string;
  mobileLink: string;
  mobileLinkActive: string;

  // Typography
  eyebrow: string;
  pageTitle: string;
  pageSubtitle: string;
  sectionTitle: string;
  body: string;
  muted: string;
  accentText: string;

  // Surfaces
  card: string;
  cardInteractive: string;
  cardTitle: string;
  media: string;
  chip: string;
  divider: string;
  timeline: string;
  timelineDot: string;
  badge: string;

  // Actions
  primaryButton: string;
  secondaryButton: string;
  textLink: string;

  footer: string;
}

const modern: SiteTheme = {
  id: "modern",
  root: "min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/20 selection:text-emerald-300 overflow-x-hidden",
  container: "max-w-5xl mx-auto px-4 sm:px-6",
  focusRing:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",

  nav: "sticky top-0 z-30 backdrop-blur-md bg-slate-950/80 border-b border-slate-800",
  navInner: "max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4",
  brand: "flex items-center gap-2 min-w-0 font-mono text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors rounded-sm",
  brandMark: "w-4 h-4 text-emerald-400 flex-shrink-0",
  navLink: "font-mono text-xs text-slate-400 hover:text-emerald-400 transition-colors rounded-sm py-1 border-b border-transparent",
  navLinkActive: "font-mono text-xs text-emerald-400 rounded-sm py-1 border-b border-emerald-400",
  navCta: "px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-colors",
  mobileToggle: "inline-flex items-center justify-center min-h-[40px] min-w-[40px] rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-emerald-400 cursor-pointer list-none",
  mobilePanel: "absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-800 bg-slate-950 shadow-xl p-2 flex flex-col",
  mobileLink: "px-3 py-2.5 rounded-lg font-mono text-sm text-slate-300 hover:bg-slate-900 hover:text-emerald-400",
  mobileLinkActive: "px-3 py-2.5 rounded-lg font-mono text-sm bg-emerald-950/50 text-emerald-400",

  eyebrow: "font-mono text-xs text-emerald-400",
  pageTitle: "text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white break-words",
  pageSubtitle: "text-base sm:text-lg text-slate-400 leading-relaxed",
  sectionTitle: "text-lg sm:text-xl font-bold text-white tracking-tight",
  body: "text-sm sm:text-base text-slate-300 leading-relaxed",
  muted: "text-xs sm:text-sm text-slate-400",
  accentText: "text-emerald-400",

  card: "rounded-xl bg-slate-900/60 border border-slate-800",
  cardInteractive: "rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors",
  cardTitle: "text-base sm:text-lg font-bold text-white break-words",
  media: "overflow-hidden rounded-lg aspect-video bg-slate-950 border border-slate-800",
  chip: "px-2 py-0.5 text-xs font-mono text-emerald-300 bg-emerald-950/40 border border-emerald-500/20 rounded",
  divider: "border-slate-800",
  timeline: "border-l border-slate-800",
  timelineDot: "bg-slate-950 border-2 border-emerald-400 ring-4 ring-slate-950",
  badge: "px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 rounded",

  primaryButton: "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-colors",
  secondaryButton: "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-colors",
  textLink: "font-mono text-sm text-emerald-400 hover:text-emerald-300 transition-colors rounded-sm",

  footer: "border-t border-slate-800 text-xs font-mono text-slate-500",
};

const minimal: SiteTheme = {
  id: "minimal",
  root: "min-h-screen bg-white text-slate-900 font-sans selection:bg-slate-200 selection:text-slate-900 overflow-x-hidden",
  container: "max-w-3xl mx-auto px-4 sm:px-6",
  focusRing: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2",

  nav: "sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-slate-100",
  navInner: "max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4",
  brand: "flex items-center gap-2 min-w-0 text-sm font-semibold tracking-tight text-slate-900 hover:text-slate-600 transition-colors rounded-sm",
  brandMark: "hidden",
  navLink: "text-xs font-medium uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors rounded-sm py-1 border-b border-transparent",
  navLinkActive: "text-xs font-medium uppercase tracking-widest text-slate-900 rounded-sm py-1 border-b border-slate-900",
  navCta: "text-xs font-medium text-slate-600 hover:text-slate-900 underline underline-offset-4 decoration-slate-300 hover:decoration-slate-900 transition-colors",
  mobileToggle: "inline-flex items-center justify-center min-h-[40px] min-w-[40px] rounded-full border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer list-none",
  mobilePanel: "absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-lg p-2 flex flex-col",
  mobileLink: "px-3 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900",
  mobileLinkActive: "px-3 py-2.5 rounded-lg text-sm font-semibold bg-slate-100 text-slate-900",

  eyebrow: "text-xs font-semibold uppercase tracking-widest text-slate-400",
  pageTitle: "text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 break-words",
  pageSubtitle: "text-base sm:text-lg text-slate-600 leading-relaxed",
  sectionTitle: "text-xs font-semibold uppercase tracking-widest text-slate-400 pb-2 border-b border-slate-100",
  body: "text-sm sm:text-base text-slate-600 leading-relaxed",
  muted: "text-xs sm:text-sm text-slate-500",
  accentText: "text-slate-900",

  card: "rounded-xl border border-slate-200 bg-white",
  cardInteractive: "rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors",
  cardTitle: "text-base sm:text-lg font-semibold text-slate-900 break-words",
  media: "overflow-hidden rounded-lg aspect-video bg-slate-50 border border-slate-100",
  chip: "px-2 py-0.5 text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200/80 rounded",
  divider: "border-slate-100",
  timeline: "border-l border-slate-200",
  timelineDot: "bg-white border-2 border-slate-900 ring-4 ring-white",
  badge: "px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-700 rounded",

  primaryButton: "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium text-white bg-slate-900 hover:bg-slate-700 transition-colors",
  secondaryButton: "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium text-slate-700 border border-slate-200 hover:border-slate-400 transition-colors",
  textLink: "text-sm font-medium text-slate-900 underline underline-offset-4 decoration-slate-300 hover:decoration-slate-900 transition-colors rounded-sm",

  footer: "border-t border-slate-100 text-xs text-slate-400",
};

const professional: SiteTheme = {
  id: "professional",
  root: "min-h-screen bg-slate-50/60 text-slate-800 font-sans selection:bg-blue-900/10 selection:text-blue-950 overflow-x-hidden",
  container: "max-w-5xl mx-auto px-4 sm:px-6",
  focusRing: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2",

  nav: "sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-2xs",
  navInner: "max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4",
  brand: "flex items-center gap-2.5 min-w-0 text-sm font-semibold tracking-tight text-slate-900 hover:text-blue-900 transition-colors rounded-sm",
  brandMark: "w-7 h-7 p-1.5 rounded bg-blue-900 text-white flex-shrink-0",
  navLink: "text-xs font-semibold tracking-wide uppercase text-slate-600 hover:text-blue-900 transition-colors rounded-sm py-1 border-b-2 border-transparent hover:border-blue-900",
  navLinkActive: "text-xs font-semibold tracking-wide uppercase text-blue-900 rounded-sm py-1 border-b-2 border-blue-900",
  navCta: "px-4 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 shadow-xs transition-colors",
  mobileToggle: "inline-flex items-center justify-center min-h-[40px] min-w-[40px] rounded-md border border-slate-200 bg-white text-slate-700 hover:text-blue-900 cursor-pointer list-none",
  mobilePanel: "absolute right-0 top-full mt-2 w-56 rounded-lg border border-slate-200 bg-white shadow-lg p-2 flex flex-col",
  mobileLink: "px-3 py-2.5 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-900",
  mobileLinkActive: "px-3 py-2.5 rounded-md text-sm font-semibold bg-blue-50 text-blue-900",

  eyebrow: "inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold tracking-wide uppercase bg-blue-50 text-blue-900 border border-blue-100",
  pageTitle: "text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 break-words",
  pageSubtitle: "text-base sm:text-lg text-slate-600 leading-relaxed",
  sectionTitle: "text-lg sm:text-xl font-bold text-slate-900 tracking-tight pb-2 border-b border-slate-200",
  body: "text-sm sm:text-base text-slate-700 leading-relaxed",
  muted: "text-xs sm:text-sm text-slate-500",
  accentText: "text-blue-900",

  card: "bg-white border border-slate-200 rounded-xl shadow-2xs",
  cardInteractive: "bg-white border border-slate-200 rounded-xl shadow-2xs hover:shadow-xs transition-shadow",
  cardTitle: "text-base sm:text-lg font-bold text-slate-900 break-words",
  media: "overflow-hidden rounded-lg aspect-video bg-slate-100 border border-slate-200",
  chip: "px-2 py-0.5 text-xs font-medium text-blue-900 bg-blue-50 border border-blue-100 rounded",
  divider: "border-slate-200",
  timeline: "border-l-2 border-slate-200",
  timelineDot: "bg-white border-2 border-blue-900 ring-4 ring-slate-50",
  badge: "px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-blue-50 text-blue-900 border border-blue-100 rounded",

  primaryButton: "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold text-white bg-blue-900 hover:bg-blue-800 shadow-xs transition-colors",
  secondaryButton: "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors",
  textLink: "text-sm font-semibold text-blue-900 hover:text-blue-800 hover:underline underline-offset-4 transition-colors rounded-sm",

  footer: "border-t border-slate-200 text-xs text-slate-500",
};

export const SITE_THEMES: Record<PortfolioTemplateId, SiteTheme> = { modern, minimal, professional };

/** Resolves the theme for a template id with the same fallback rules as TemplateRenderer. */
export function getSiteTheme(templateId?: string | null): SiteTheme {
  return SITE_THEMES[getTemplateDefinition(templateId).meta.id];
}

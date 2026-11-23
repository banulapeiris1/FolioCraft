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

  // Layout (Phase 13: replaces hardcoded template-id checks in shared views)
  /** Main column of two-column pages (About, Project detail), inside a lg:grid-cols-3 grid. */
  mainColumn: string;
  /** Side column of two-column pages; "lg:col-span-3" stacks it under the main column. */
  sideColumn: string;
  /** Extra grid classes for the Projects listing (base: grid grid-cols-1 gap-6). */
  projectGrid: string;

  // Navigation
  /** "handle" shows ~/username, "name" shows the owner's name. */
  brandStyle: "handle" | "name";
  /** Brand mark beside the label; "monogram" renders the owner's initials in brandMark. */
  brandIcon: "code" | "briefcase" | "monogram" | "none";
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
  root: "min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/20 selection:text-emerald-300 overflow-x-clip",
  container: "max-w-5xl mx-auto px-4 sm:px-6",
  focusRing:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",

  mainColumn: "lg:col-span-2",
  sideColumn: "",
  projectGrid: "md:grid-cols-2",

  brandStyle: "handle",
  brandIcon: "code",
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
  root: "min-h-screen bg-white text-slate-900 font-sans selection:bg-slate-200 selection:text-slate-900 overflow-x-clip",
  container: "max-w-3xl mx-auto px-4 sm:px-6",
  focusRing: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2",

  mainColumn: "lg:col-span-3",
  sideColumn: "lg:col-span-3",
  projectGrid: "",

  brandStyle: "name",
  brandIcon: "none",
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
  root: "min-h-screen bg-slate-50/60 text-slate-800 font-sans selection:bg-blue-900/10 selection:text-blue-950 overflow-x-clip",
  container: "max-w-5xl mx-auto px-4 sm:px-6",
  focusRing: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2",

  mainColumn: "lg:col-span-2",
  sideColumn: "",
  projectGrid: "md:grid-cols-2",

  brandStyle: "name",
  brandIcon: "briefcase",
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

// ---------------------------------------------------------------------------
// Phase 13 themes — each mirrors the visual identity of its home template.
// ---------------------------------------------------------------------------

/** Editorial: warm paper, Fraunces display, ruled lines, oxblood accent. */
const editorial: SiteTheme = {
  id: "editorial",
  root: "min-h-screen bg-[#f6f1e7] text-[#1c1917] font-text-serif selection:bg-[#8a2c0d] selection:text-[#f6f1e7] overflow-x-clip",
  container: "max-w-6xl mx-auto px-4 sm:px-8",
  focusRing:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a2c0d] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6f1e7]",

  mainColumn: "lg:col-span-2",
  sideColumn: "",
  projectGrid: "md:grid-cols-2",

  brandStyle: "name",
  brandIcon: "none",
  nav: "sticky top-0 z-30 bg-[#f6f1e7]/95 backdrop-blur-sm border-b-2 border-[#1c1917]",
  navInner: "max-w-6xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4",
  brand: "flex items-center gap-2 min-w-0 font-display-serif text-lg font-semibold tracking-tight text-[#1c1917] hover:text-[#8a2c0d] transition-colors rounded-sm",
  brandMark: "hidden",
  navLink: "font-sans text-[11px] uppercase tracking-[0.18em] text-[#57534e] hover:text-[#8a2c0d] transition-colors rounded-sm py-1 border-b border-transparent",
  navLinkActive: "font-sans text-[11px] uppercase tracking-[0.18em] text-[#8a2c0d] rounded-sm py-1 border-b border-[#8a2c0d]",
  navCta: "font-sans text-[11px] uppercase tracking-[0.18em] px-3 py-1.5 border border-[#1c1917] text-[#1c1917] hover:bg-[#1c1917] hover:text-[#f6f1e7] transition-colors",
  mobileToggle: "inline-flex items-center justify-center min-h-[40px] min-w-[40px] border border-[#1c1917] text-[#1c1917] hover:bg-[#1c1917] hover:text-[#f6f1e7] cursor-pointer list-none",
  mobilePanel: "absolute right-0 top-full mt-2 w-56 border-2 border-[#1c1917] bg-[#f6f1e7] shadow-lg p-2 flex flex-col",
  mobileLink: "px-3 py-2.5 font-sans text-xs uppercase tracking-[0.16em] text-[#44403c] hover:text-[#8a2c0d]",
  mobileLinkActive: "px-3 py-2.5 font-sans text-xs uppercase tracking-[0.16em] text-[#8a2c0d] bg-[#ece4d4]",

  eyebrow: "font-sans text-[11px] uppercase tracking-[0.2em] text-[#8a2c0d]",
  pageTitle: "font-display-serif text-4xl sm:text-5xl md:text-7xl font-semibold tracking-tight leading-[0.95] text-[#1c1917] break-words",
  pageSubtitle: "font-display-serif italic text-lg sm:text-2xl text-[#57534e] leading-snug",
  sectionTitle: "font-display-serif text-2xl sm:text-3xl font-medium tracking-tight text-[#1c1917] pt-3 border-t-2 border-[#1c1917]",
  body: "text-base sm:text-lg text-[#292524] leading-relaxed",
  muted: "font-sans text-xs sm:text-sm text-[#57534e]",
  accentText: "text-[#8a2c0d]",

  card: "border-t-2 border-[#1c1917] bg-transparent",
  cardInteractive: "border-t-2 border-[#1c1917] bg-transparent hover:bg-[#efe7d8] transition-colors",
  cardTitle: "font-display-serif text-xl sm:text-2xl font-medium tracking-tight text-[#1c1917] break-words",
  media: "overflow-hidden aspect-[4/3] bg-[#ece4d4] border border-[#1c1917] grayscale",
  chip: "font-sans text-[11px] uppercase tracking-[0.14em] text-[#57534e] px-2 py-0.5 border border-[#1c1917]/30",
  divider: "border-[#1c1917]/25",
  timeline: "border-l-2 border-[#1c1917]",
  timelineDot: "bg-[#8a2c0d] ring-4 ring-[#f6f1e7]",
  badge: "font-sans px-1.5 py-0.5 text-[10px] uppercase tracking-[0.16em] bg-[#8a2c0d] text-[#f6f1e7]",

  primaryButton: "inline-flex items-center justify-center gap-2 px-5 py-2.5 font-sans text-xs uppercase tracking-[0.16em] text-[#f6f1e7] bg-[#1c1917] hover:bg-[#8a2c0d] transition-colors",
  secondaryButton: "inline-flex items-center justify-center gap-2 px-5 py-2.5 font-sans text-xs uppercase tracking-[0.16em] text-[#1c1917] border border-[#1c1917] hover:bg-[#1c1917] hover:text-[#f6f1e7] transition-colors",
  textLink: "font-sans text-sm text-[#1c1917] underline underline-offset-4 decoration-[#8a2c0d] hover:text-[#8a2c0d] transition-colors rounded-sm",

  footer: "bg-[#1c1917] text-[11px] font-sans uppercase tracking-[0.18em] text-[#f6f1e7]/60",
};

/** Executive Suite: ivory reading surface, charcoal + muted gold, serif headings. */
const executive: SiteTheme = {
  id: "executive",
  root: "min-h-screen bg-[#fbfaf7] text-[#2b2f36] font-sans selection:bg-[#b08d57]/25 selection:text-[#1f2329] overflow-x-clip",
  container: "max-w-6xl mx-auto px-4 sm:px-6",
  focusRing:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b08d57] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbfaf7]",

  mainColumn: "lg:col-span-2",
  sideColumn: "",
  projectGrid: "md:grid-cols-2",

  brandStyle: "name",
  brandIcon: "monogram",
  nav: "sticky top-0 z-30 bg-[#1f2329] border-b border-[#b08d57]/40",
  navInner: "max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4",
  brand: "flex items-center gap-3 min-w-0 font-text-serif text-base sm:text-lg font-semibold text-white hover:text-[#d6b98a] transition-colors rounded-sm",
  brandMark: "w-8 h-8 flex items-center justify-center border border-[#b08d57] font-text-serif text-xs text-[#d6b98a] flex-shrink-0",
  navLink: "text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c9c5bc] hover:text-[#d6b98a] transition-colors rounded-sm py-1 border-b border-transparent",
  navLinkActive: "text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d6b98a] rounded-sm py-1 border-b border-[#d6b98a]",
  navCta: "px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1f2329] bg-[#d6b98a] hover:bg-[#e5cfa8] transition-colors",
  mobileToggle: "inline-flex items-center justify-center min-h-[40px] min-w-[40px] border border-white/20 text-[#e9e6df] hover:border-[#b08d57] cursor-pointer list-none",
  mobilePanel: "absolute right-0 top-full mt-2 w-56 border border-[#b08d57]/40 bg-[#1f2329] shadow-xl p-2 flex flex-col",
  mobileLink: "px-3 py-2.5 text-sm text-[#e9e6df] hover:text-[#d6b98a] hover:bg-white/5",
  mobileLinkActive: "px-3 py-2.5 text-sm font-semibold text-[#d6b98a] bg-white/10",

  eyebrow: "text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9a7742]",
  pageTitle: "font-text-serif text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-[#1f2329] break-words",
  pageSubtitle: "font-text-serif text-lg sm:text-xl text-[#5b6170] leading-relaxed",
  sectionTitle: "font-text-serif text-xl sm:text-2xl font-semibold text-[#1f2329] tracking-tight pb-3 border-b border-[#b08d57]/50",
  body: "text-sm sm:text-base text-[#454a55] leading-relaxed",
  muted: "text-xs sm:text-sm text-[#7a8090]",
  accentText: "text-[#9a7742]",

  card: "bg-white border border-[#e7e2d8]",
  cardInteractive: "bg-white border border-[#e7e2d8] border-l-4 border-l-[#1f2329] hover:border-l-[#b08d57] transition-colors",
  cardTitle: "font-text-serif text-lg sm:text-xl font-semibold text-[#1f2329] break-words",
  media: "overflow-hidden aspect-video bg-[#efece5] border border-[#e7e2d8]",
  chip: "px-2 py-0.5 text-xs text-[#5b6170] bg-[#f3f0e9] border border-[#e7e2d8]",
  divider: "border-[#e7e2d8]",
  timeline: "border-l border-[#b08d57]/60",
  timelineDot: "bg-[#1f2329] border-2 border-[#b08d57] ring-4 ring-[#fbfaf7]",
  badge: "px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-[#1f2329] text-[#d6b98a]",

  primaryButton: "inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-white bg-[#1f2329] hover:bg-[#343a44] transition-colors",
  secondaryButton: "inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#1f2329] border border-[#b08d57] hover:bg-[#f3ece0] transition-colors",
  textLink: "text-sm font-semibold text-[#9a7742] hover:text-[#1f2329] transition-colors rounded-sm",

  footer: "border-t border-[#e7e2d8] text-xs text-[#7a8090]",
};

/** Academic CV: white paper, Source Serif throughout, maroon small-caps labels. */
const academic: SiteTheme = {
  id: "academic",
  root: "min-h-screen bg-[#fdfcf9] text-[#2a2522] font-text-serif selection:bg-[#7a1f2b]/15 overflow-x-clip",
  container: "max-w-4xl mx-auto px-4 sm:px-6",
  focusRing: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7a1f2b] focus-visible:ring-offset-2",

  mainColumn: "lg:col-span-3",
  sideColumn: "lg:col-span-3",
  projectGrid: "",

  brandStyle: "name",
  brandIcon: "none",
  nav: "sticky top-0 z-30 bg-[#fdfcf9]/95 backdrop-blur-sm border-b border-[#e6e1d8]",
  navInner: "max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4",
  brand: "flex items-center gap-2 min-w-0 text-base font-semibold text-[#1d1917] hover:text-[#7a1f2b] transition-colors rounded-sm",
  brandMark: "hidden",
  navLink: "text-sm text-[#5c534d] hover:text-[#7a1f2b] transition-colors rounded-sm py-1 border-b border-transparent",
  navLinkActive: "text-sm text-[#7a1f2b] font-semibold rounded-sm py-1 border-b border-[#7a1f2b]",
  navCta: "text-sm text-[#7a1f2b] hover:underline underline-offset-4",
  mobileToggle: "inline-flex items-center justify-center min-h-[40px] min-w-[40px] rounded border border-[#e6e1d8] text-[#2a2522] hover:border-[#7a1f2b] cursor-pointer list-none",
  mobilePanel: "absolute right-0 top-full mt-2 w-56 rounded border border-[#e6e1d8] bg-[#fdfcf9] shadow-lg p-2 flex flex-col",
  mobileLink: "px-3 py-2.5 rounded text-sm text-[#4a423d] hover:text-[#7a1f2b] hover:bg-[#f5f1ea]",
  mobileLinkActive: "px-3 py-2.5 rounded text-sm font-semibold text-[#7a1f2b] bg-[#f5ecec]",

  eyebrow: "text-xs font-semibold uppercase tracking-[0.14em] text-[#7a1f2b]",
  pageTitle: "text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-[#1d1917] break-words",
  pageSubtitle: "text-lg sm:text-xl italic text-[#5c534d] leading-relaxed",
  sectionTitle: "text-sm font-semibold uppercase tracking-[0.14em] text-[#7a1f2b] pb-2 border-b border-[#e6e1d8]",
  body: "text-base sm:text-[17px] text-[#2a2522] leading-relaxed",
  muted: "text-sm text-[#6b615a]",
  accentText: "text-[#7a1f2b] italic",

  card: "border-t border-[#e6e1d8] bg-transparent",
  cardInteractive: "border-t border-[#e6e1d8] bg-transparent hover:bg-[#f7f3ec] transition-colors",
  cardTitle: "text-lg font-semibold text-[#1d1917] break-words",
  media: "overflow-hidden aspect-video bg-[#f5f1ea] border border-[#e6e1d8]",
  chip: "px-2 py-0.5 text-sm italic text-[#5c534d] border border-[#e6e1d8] rounded",
  divider: "border-[#e6e1d8]",
  timeline: "border-l border-[#e6e1d8]",
  timelineDot: "bg-[#fdfcf9] border-2 border-[#7a1f2b] ring-4 ring-[#fdfcf9]",
  badge: "px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#7a1f2b] border border-[#7a1f2b]/40 rounded",

  primaryButton: "inline-flex items-center justify-center gap-2 px-4 py-2 rounded text-sm font-semibold text-white bg-[#7a1f2b] hover:bg-[#5f1721] transition-colors",
  secondaryButton: "inline-flex items-center justify-center gap-2 px-4 py-2 rounded text-sm font-semibold text-[#7a1f2b] border border-[#7a1f2b]/40 hover:bg-[#f5ecec] transition-colors",
  textLink: "text-sm text-[#7a1f2b] hover:underline underline-offset-4 transition-colors rounded-sm",

  footer: "border-t border-[#e6e1d8] text-xs text-[#8a7f77]",
};

/** Bento Developer: warm grey canvas, rounded-3xl white tiles, zinc + lime. */
const bento: SiteTheme = {
  id: "bento",
  root: "min-h-screen bg-[#efeee9] text-zinc-900 font-sans selection:bg-lime-300 selection:text-zinc-900 overflow-x-clip",
  container: "max-w-6xl mx-auto px-4 sm:px-6",
  focusRing:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#efeee9]",

  mainColumn: "lg:col-span-2",
  sideColumn: "",
  projectGrid: "md:grid-cols-2 lg:grid-cols-3",

  brandStyle: "name",
  brandIcon: "monogram",
  nav: "sticky top-3 z-30 mx-4 mt-3 rounded-full bg-white/90 backdrop-blur border border-black/5 shadow-sm",
  navInner: "max-w-6xl mx-auto pl-2 pr-3 py-2 flex items-center justify-between gap-4",
  brand: "flex items-center gap-2 min-w-0 font-grotesk text-sm font-semibold text-zinc-900 rounded-full",
  brandMark: "w-8 h-8 rounded-full bg-zinc-900 text-lime-300 font-grotesk text-xs font-bold flex items-center justify-center flex-shrink-0",
  navLink: "px-3 py-1.5 rounded-full text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors",
  navLinkActive: "px-3 py-1.5 rounded-full text-xs font-semibold bg-zinc-900 text-white",
  navCta: "px-4 py-1.5 rounded-full text-xs font-semibold text-zinc-900 bg-lime-300 hover:bg-lime-200 transition-colors",
  mobileToggle: "inline-flex items-center justify-center min-h-[40px] min-w-[40px] rounded-full bg-zinc-100 text-zinc-800 hover:bg-zinc-200 cursor-pointer list-none",
  mobilePanel: "absolute right-0 top-full mt-3 w-56 rounded-3xl border border-black/5 bg-white shadow-xl p-2 flex flex-col",
  mobileLink: "px-4 py-2.5 rounded-2xl text-sm text-zinc-700 hover:bg-zinc-100",
  mobileLinkActive: "px-4 py-2.5 rounded-2xl text-sm font-semibold bg-zinc-900 text-white",

  eyebrow: "font-grotesk text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500",
  pageTitle: "font-grotesk text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.02] text-zinc-900 break-words",
  pageSubtitle: "font-grotesk text-lg sm:text-xl text-zinc-500 leading-relaxed",
  sectionTitle: "font-grotesk text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500",
  body: "text-sm sm:text-base text-zinc-700 leading-relaxed",
  muted: "text-xs sm:text-sm text-zinc-500",
  accentText: "text-zinc-900 font-grotesk",

  card: "rounded-3xl bg-white border border-black/5",
  cardInteractive: "rounded-3xl bg-white border border-black/5 hover:-translate-y-0.5 hover:shadow-md transition",
  cardTitle: "font-grotesk text-lg sm:text-xl font-bold tracking-tight text-zinc-900 break-words",
  media: "overflow-hidden rounded-2xl aspect-video bg-zinc-100",
  chip: "px-3 py-1 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-800",
  divider: "border-black/5",
  timeline: "border-l-2 border-zinc-300",
  timelineDot: "bg-lime-400 ring-4 ring-lime-100",
  badge: "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-lime-300 text-zinc-900",

  primaryButton: "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-zinc-900 hover:bg-zinc-700 transition-colors",
  secondaryButton: "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-zinc-900 bg-white border border-black/10 hover:bg-zinc-50 transition-colors",
  textLink: "text-sm font-semibold text-zinc-900 underline underline-offset-4 decoration-lime-400 decoration-2 hover:decoration-zinc-900 transition-colors rounded-sm",

  footer: "text-xs text-zinc-500",
};

/** Creative Studio: near-black, signal orange, Space Grotesk uppercase display. */
const studio: SiteTheme = {
  id: "studio",
  root: "min-h-screen bg-[#111111] text-[#f2efe8] font-grotesk selection:bg-[#ff5b1f] selection:text-[#111111] overflow-x-clip",
  container: "max-w-7xl mx-auto px-4 sm:px-8",
  focusRing:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5b1f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]",

  mainColumn: "lg:col-span-2",
  sideColumn: "",
  projectGrid: "md:grid-cols-2",

  brandStyle: "name",
  brandIcon: "none",
  nav: "sticky top-0 z-30 bg-[#111111]/95 backdrop-blur-sm border-b border-white/10",
  navInner: "max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between gap-4",
  brand: "flex items-center gap-2 min-w-0 font-bold uppercase tracking-tight text-sm sm:text-base text-[#f2efe8] hover:text-[#ff5b1f] transition-colors rounded-sm",
  brandMark: "hidden",
  navLink: "text-sm text-white/70 hover:text-[#ff5b1f] transition-colors rounded-sm py-1 border-b-2 border-transparent",
  navLinkActive: "text-sm font-bold text-[#ff5b1f] rounded-sm py-1 border-b-2 border-[#ff5b1f]",
  navCta: "px-4 py-2 rounded-full text-xs sm:text-sm font-bold text-[#111111] bg-[#ff5b1f] hover:bg-[#ff7a45] transition-colors",
  mobileToggle: "inline-flex items-center justify-center min-h-[40px] min-w-[40px] rounded-full border border-white/25 text-[#f2efe8] hover:border-[#ff5b1f] cursor-pointer list-none",
  mobilePanel: "absolute right-0 top-full mt-2 w-56 border-2 border-[#ff5b1f] bg-[#111111] shadow-xl p-2 flex flex-col",
  mobileLink: "px-3 py-2.5 text-sm font-bold uppercase tracking-wide text-[#f2efe8] hover:text-[#ff5b1f]",
  mobileLinkActive: "px-3 py-2.5 text-sm font-bold uppercase tracking-wide text-[#111111] bg-[#ff5b1f]",

  eyebrow: "text-sm font-medium uppercase tracking-[0.2em] text-[#ff5b1f]",
  pageTitle: "text-5xl sm:text-7xl md:text-8xl font-bold uppercase tracking-tighter leading-[0.88] text-[#f2efe8] break-words",
  pageSubtitle: "text-lg sm:text-2xl text-white/70 leading-snug",
  sectionTitle: "text-2xl sm:text-3xl font-bold uppercase tracking-tighter text-[#f2efe8]",
  body: "text-base sm:text-lg text-white/75 leading-relaxed",
  muted: "text-xs sm:text-sm text-white/50",
  accentText: "text-[#ff5b1f]",

  card: "border border-white/15 bg-white/[0.03]",
  cardInteractive: "border border-white/15 bg-white/[0.03] hover:border-[#ff5b1f] transition-colors",
  cardTitle: "text-xl sm:text-2xl font-bold uppercase tracking-tight text-[#f2efe8] break-words",
  media: "overflow-hidden aspect-[16/10] bg-[#f2efe8]",
  chip: "px-3 py-1 rounded-full border border-white/25 text-xs uppercase tracking-wider text-[#f2efe8]",
  divider: "border-white/15",
  timeline: "border-l-2 border-[#ff5b1f]",
  timelineDot: "bg-[#ff5b1f] ring-4 ring-[#111111]",
  badge: "px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#ff5b1f] text-[#111111]",

  primaryButton: "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold uppercase tracking-wider text-[#111111] bg-[#ff5b1f] hover:bg-[#ff7a45] transition-colors",
  secondaryButton: "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold uppercase tracking-wider text-[#f2efe8] border border-white/25 hover:border-[#ff5b1f] hover:text-[#ff5b1f] transition-colors",
  textLink: "text-sm font-bold uppercase tracking-wider text-[#ff5b1f] hover:text-[#f2efe8] transition-colors rounded-sm",

  footer: "border-t border-white/10 text-xs uppercase tracking-[0.18em] text-white/40",
};

/** Project Showcase: cool grey canvas, white repo cards, indigo, mono metadata. */
const showcase: SiteTheme = {
  id: "showcase",
  root: "min-h-screen bg-[#f6f8fa] text-slate-800 font-sans selection:bg-indigo-200 selection:text-indigo-950 overflow-x-clip",
  container: "max-w-6xl mx-auto px-4 sm:px-6",
  focusRing:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6f8fa]",

  mainColumn: "lg:col-span-2",
  sideColumn: "",
  projectGrid: "md:grid-cols-2 xl:grid-cols-3",

  brandStyle: "handle",
  brandIcon: "code",
  nav: "sticky top-0 z-30 bg-white border-b border-slate-200",
  navInner: "max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4",
  brand: "flex items-center gap-2 min-w-0 font-mono text-sm font-semibold text-slate-900 hover:text-indigo-600 transition-colors rounded-sm",
  brandMark: "w-4 h-4 text-indigo-600 flex-shrink-0",
  navLink: "text-sm text-slate-600 hover:text-slate-900 transition-colors rounded-sm py-2 border-b-2 border-transparent hover:border-slate-300",
  navLinkActive: "text-sm font-semibold text-slate-900 rounded-sm py-2 border-b-2 border-indigo-500",
  navCta: "px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors",
  mobileToggle: "inline-flex items-center justify-center min-h-[40px] min-w-[40px] rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer list-none",
  mobilePanel: "absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-lg p-2 flex flex-col",
  mobileLink: "px-3 py-2.5 rounded-lg text-sm text-slate-700 hover:bg-slate-50",
  mobileLinkActive: "px-3 py-2.5 rounded-lg text-sm font-semibold bg-indigo-50 text-indigo-700",

  eyebrow: "font-mono text-xs font-semibold uppercase tracking-wider text-indigo-600",
  pageTitle: "text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 break-words",
  pageSubtitle: "text-base sm:text-lg text-slate-600 leading-relaxed",
  sectionTitle: "text-lg font-bold text-slate-900",
  body: "text-sm sm:text-base text-slate-700 leading-relaxed",
  muted: "text-xs sm:text-sm text-slate-500",
  accentText: "text-indigo-700",

  card: "bg-white border border-slate-200 rounded-xl",
  cardInteractive: "bg-white border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors",
  cardTitle: "text-base sm:text-lg font-semibold text-indigo-700 break-words",
  media: "overflow-hidden rounded-lg aspect-video bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 border border-slate-200",
  chip: "px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-mono",
  divider: "border-slate-200",
  timeline: "border-l-2 border-slate-200",
  timelineDot: "bg-indigo-500 ring-4 ring-[#f6f8fa]",
  badge: "px-2 py-0.5 rounded-full border border-indigo-200 bg-indigo-50 text-[10px] font-semibold text-indigo-700",

  primaryButton: "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors",
  secondaryButton: "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 transition-colors",
  textLink: "text-sm font-semibold text-indigo-600 hover:text-indigo-500 hover:underline underline-offset-4 transition-colors rounded-sm",

  footer: "border-t border-slate-200 bg-white text-xs text-slate-500",
};

export const SITE_THEMES: Record<PortfolioTemplateId, SiteTheme> = {
  modern,
  minimal,
  professional,
  editorial,
  bento,
  studio,
  executive,
  showcase,
  academic,
};

/** Resolves the theme for a template id with the same fallback rules as TemplateRenderer. */
export function getSiteTheme(templateId?: string | null): SiteTheme {
  return SITE_THEMES[getTemplateDefinition(templateId).meta.id];
}

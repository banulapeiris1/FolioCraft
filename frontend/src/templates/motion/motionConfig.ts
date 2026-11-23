import type React from "react";
import type { PortfolioTemplateId } from "@/types/portfolio";

/**
 * Centralised animation configuration for every FolioCraft template (Phase 14).
 *
 * Templates never hard-code durations or distances. They mark elements with
 * the attribute helpers below (revealProps / heroItemProps / motionCardProps)
 * and the active preset is applied once, by <MotionRoot>, as CSS custom
 * properties consumed by motion.css. One system serves all nine templates.
 */

/** Animation styles a portfolio owner can choose (persisted per portfolio). */
export const ANIMATION_STYLES = ["subtle", "creative", "minimal"] as const;

export type AnimationStyle = (typeof ANIMATION_STYLES)[number];

/**
 * Effective motion mode. "none" is internal only (e.g. template gallery
 * thumbnails) and is never stored.
 */
export type MotionMode = AnimationStyle | "none";

/** Default for new and existing portfolios: light, professional motion. */
export const DEFAULT_ANIMATION_STYLE: AnimationStyle = "subtle";

/** Largest stagger index honoured, so long lists never wait seconds to appear. */
export const MAX_STAGGER_INDEX = 8;

export interface MotionPreset {
  label: string;
  description: string;
  /** CSS easing used by reveals, hero entrance and hover transitions. */
  easing: string;
  revealDurationMs: number;
  revealDistancePx: number;
  revealScale: number;
  revealStaggerMs: number;
  heroDurationMs: number;
  heroDistancePx: number;
  /** Hero starts partly visible so first paint is never blank. */
  heroFromOpacity: number;
  heroStaggerMs: number;
  hoverDurationMs: number;
  hoverLiftPx: number;
  imageZoom: number;
  /** Whether public page navigations animate (crossfade + directional). */
  pageTransitions: boolean;
}

export const MOTION_PRESETS: Record<MotionMode, MotionPreset> = {
  none: {
    label: "No motion",
    description: "Static rendering with no animation.",
    easing: "linear",
    revealDurationMs: 0,
    revealDistancePx: 0,
    revealScale: 1,
    revealStaggerMs: 0,
    heroDurationMs: 0,
    heroDistancePx: 0,
    heroFromOpacity: 1,
    heroStaggerMs: 0,
    hoverDurationMs: 0,
    hoverLiftPx: 0,
    imageZoom: 1,
    pageTransitions: false,
  },
  minimal: {
    label: "Minimal Motion",
    description: "Very limited animation: short fades only, no movement.",
    easing: "ease-out",
    revealDurationMs: 400,
    revealDistancePx: 0,
    revealScale: 1,
    revealStaggerMs: 0,
    heroDurationMs: 350,
    heroDistancePx: 0,
    heroFromOpacity: 0.5,
    heroStaggerMs: 0,
    hoverDurationMs: 150,
    hoverLiftPx: 0,
    imageZoom: 1,
    pageTransitions: false,
  },
  subtle: {
    label: "Subtle Professional",
    description: "Minimal, elegant motion: gentle fades and small rises.",
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    revealDurationMs: 560,
    revealDistancePx: 16,
    revealScale: 1,
    revealStaggerMs: 60,
    heroDurationMs: 450,
    heroDistancePx: 10,
    heroFromOpacity: 0.35,
    heroStaggerMs: 70,
    hoverDurationMs: 200,
    hoverLiftPx: 3,
    imageZoom: 1.02,
    pageTransitions: true,
  },
  creative: {
    label: "Interactive Creative",
    description: "More expressive reveals, hover interactions and transitions.",
    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    revealDurationMs: 720,
    revealDistancePx: 32,
    revealScale: 0.98,
    revealStaggerMs: 90,
    heroDurationMs: 450,
    heroDistancePx: 24,
    heroFromOpacity: 0.15,
    heroStaggerMs: 90,
    hoverDurationMs: 240,
    hoverLiftPx: 6,
    imageZoom: 1.05,
    pageTransitions: true,
  },
};

/** Editor copy for the user-selectable styles (titles come from MOTION_PRESETS). */
export interface AnimationStyleOption {
  id: AnimationStyle;
  label: string;
  tagline: string;
  description: string;
  recommended?: boolean;
}

const ANIMATION_STYLE_COPY: Record<AnimationStyle, Omit<AnimationStyleOption, "id" | "label">> = {
  subtle: {
    tagline: "Clean and elegant",
    description: "Gentle fades and small rises, light card lift and a smooth crossfade between pages.",
    recommended: true,
  },
  creative: {
    tagline: "More dynamic and interactive",
    description: "Stronger entrances, longer staggers, bolder card and image effects, directional page slides.",
  },
  minimal: {
    tagline: "Simple and distraction-free",
    description: "Soft fades only. No movement, hover effects, image zoom or page slides.",
  },
};

/** The three user-selectable styles, in display order. "none" is never offered. */
export const ANIMATION_STYLE_OPTIONS: readonly AnimationStyleOption[] = ANIMATION_STYLES.map((id) => ({
  id,
  label: MOTION_PRESETS[id].label,
  ...ANIMATION_STYLE_COPY[id],
}));

/** Ordering used to cap a style at a template's maximum intensity. */
const INTENSITY: Record<MotionMode, number> = { none: 0, minimal: 1, subtle: 2, creative: 3 };

/**
 * Template-specific customisation: the most expressive style a template
 * allows. Formal layouts stay restrained even if "creative" is chosen.
 */
export const TEMPLATE_MOTION_CAPS: Partial<Record<PortfolioTemplateId, AnimationStyle>> = {
  academic: "subtle",
  executive: "subtle",
};

export function isAnimationStyle(value: unknown): value is AnimationStyle {
  return typeof value === "string" && (ANIMATION_STYLES as readonly string[]).includes(value);
}

/** Normalises any stored/raw value to a valid style, defaulting to "subtle". */
export function normalizeAnimationStyle(value: unknown): AnimationStyle {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (isAnimationStyle(normalized)) return normalized;
  }
  return DEFAULT_ANIMATION_STYLE;
}

/**
 * Resolves the motion mode actually rendered.
 * - `override` (e.g. "none" for gallery thumbnails) wins when valid.
 * - Otherwise the portfolio's style is normalised and capped per template.
 */
export function resolveMotionMode(
  animationStyle: unknown,
  templateId?: string | null,
  override?: unknown
): MotionMode {
  if (override === "none") return "none";
  if (isAnimationStyle(override)) return override;

  const style = normalizeAnimationStyle(animationStyle);
  const cap =
    typeof templateId === "string"
      ? TEMPLATE_MOTION_CAPS[templateId.trim().toLowerCase() as PortfolioTemplateId]
      : undefined;
  return cap && INTENSITY[style] > INTENSITY[cap] ? cap : style;
}

/** CSS custom properties for a mode, applied on the <MotionRoot> element. */
export function getMotionCssVars(mode: MotionMode): Record<string, string> {
  if (mode === "none") return {};
  const p = MOTION_PRESETS[mode];
  return {
    "--motion-ease": p.easing,
    "--motion-reveal-duration": `${p.revealDurationMs}ms`,
    "--motion-reveal-distance": `${p.revealDistancePx}px`,
    "--motion-reveal-scale": String(p.revealScale),
    "--motion-reveal-stagger": `${p.revealStaggerMs}ms`,
    "--motion-hero-duration": `${p.heroDurationMs}ms`,
    "--motion-hero-distance": `${p.heroDistancePx}px`,
    "--motion-hero-from-opacity": String(p.heroFromOpacity),
    "--motion-hero-stagger": `${p.heroStaggerMs}ms`,
    "--motion-hover-duration": `${p.hoverDurationMs}ms`,
    "--motion-hover-lift": `${p.hoverLiftPx}px`,
    "--motion-image-zoom": String(p.imageZoom),
  };
}

function clampIndex(index: number | undefined): number {
  if (typeof index !== "number" || !Number.isFinite(index) || index <= 0) return 0;
  return Math.min(Math.floor(index), MAX_STAGGER_INDEX);
}

type DataAttributes = { [key: `data-${string}`]: string };
export type MotionAttributeProps = DataAttributes & { style?: React.CSSProperties };

/**
 * Marks an element to fade/rise in when scrolled into view. Safe in Server
 * Components: it only emits attributes. Content is never hidden in the
 * server HTML; hiding requires JS (data-motion-ready) and motion preference.
 */
export function revealProps(index?: number): MotionAttributeProps {
  const i = clampIndex(index);
  return i > 0
    ? { "data-reveal": "", style: { ["--reveal-i" as string]: i } as React.CSSProperties }
    : { "data-reveal": "" };
}

/** Marks a hero element for the CSS-only entrance animation (no JS needed). */
export function heroItemProps(index?: number): MotionAttributeProps {
  const i = clampIndex(index);
  return i > 0
    ? { "data-hero-item": "", style: { ["--hero-i" as string]: i } as React.CSSProperties }
    : { "data-hero-item": "" };
}

/** Marks an interactive card for preset-driven hover/focus lift. */
export function motionCardProps(): MotionAttributeProps {
  return { "data-motion-card": "" };
}

/** Marks card media for preset-driven hover zoom. */
export function motionMediaProps(): MotionAttributeProps {
  return { "data-motion-media": "" };
}

/**
 * Template visual identity (Phase 14, Stage 2): which kinds of motion suit a
 * template's design. The style (subtle / creative / minimal) still decides how
 * strong each effect is; the profile decides where effects appear at all.
 */
export interface TemplateMotionProfile {
  /** Reveal individual entries (cards, roles, skill groups) instead of whole sections. */
  itemReveals: boolean;
  /** Hover / keyboard-focus lift on interactive project cards. */
  cardLift: boolean;
  /** Hover zoom on card images (only applied inside clipped image frames). */
  mediaZoom: boolean;
}

const EXPRESSIVE: TemplateMotionProfile = { itemReveals: true, cardLift: true, mediaZoom: true };

export const TEMPLATE_MOTION_PROFILES: Record<PortfolioTemplateId, TemplateMotionProfile> = {
  // Smooth, interactive developer showcase.
  modern: EXPRESSIVE,
  // Distraction-free: whole sections fade in, nothing moves on hover.
  minimal: { itemReveals: false, cardLift: false, mediaZoom: false },
  // Restrained corporate: entries reveal, cards lift, images stay still.
  professional: { itemReveals: true, cardLift: true, mediaZoom: false },
  // Image-led print layout: entries and images, no card lift.
  editorial: { itemReveals: true, cardLift: false, mediaZoom: true },
  // Interactive tiles.
  bento: EXPRESSIVE,
  // Creative presentation.
  studio: EXPRESSIVE,
  // Premium and still: entries reveal, no hover movement.
  executive: { itemReveals: true, cardLift: false, mediaZoom: false },
  // Project-first gallery.
  showcase: EXPRESSIVE,
  // Readable CV: whole sections only.
  academic: { itemReveals: false, cardLift: false, mediaZoom: false },
};

export function getTemplateMotionProfile(templateId?: string | null): TemplateMotionProfile {
  const id = typeof templateId === "string" ? templateId.trim().toLowerCase() : "";
  return TEMPLATE_MOTION_PROFILES[id as PortfolioTemplateId] ?? EXPRESSIVE;
}

const NO_PROPS: MotionAttributeProps = {};

/** Marker helpers bound to one template's profile, used by templates and site views. */
export interface TemplateMotion {
  profile: TemplateMotionProfile;
  /** Whole-section reveal, used when the template does not reveal entries individually. */
  section: () => MotionAttributeProps;
  /** Section-heading reveal, used when entries reveal individually (so reveals never nest). */
  heading: () => MotionAttributeProps;
  /** Entry reveal; `columns` restarts the stagger on every row of a grid. */
  item: (index?: number, columns?: number) => MotionAttributeProps;
  card: () => MotionAttributeProps;
  media: () => MotionAttributeProps;
}

export function getTemplateMotion(templateId?: string | null): TemplateMotion {
  const profile = getTemplateMotionProfile(templateId);
  return {
    profile,
    section: () => (profile.itemReveals ? NO_PROPS : revealProps()),
    heading: () => (profile.itemReveals ? revealProps() : NO_PROPS),
    item: (index = 0, columns = 1) =>
      profile.itemReveals ? revealProps(index % Math.max(1, Math.floor(columns))) : NO_PROPS,
    card: () => (profile.cardLift ? motionCardProps() : NO_PROPS),
    media: () => (profile.mediaZoom ? motionMediaProps() : NO_PROPS),
  };
}

/** Navigation direction tags passed to <Link transitionTypes>. */
export const NAV_FORWARD = "nav-forward";
export const NAV_BACK = "nav-back";

export interface PageTransitionClasses {
  enter: Record<string, string>;
  exit: Record<string, string>;
}

/**
 * "auto": the transition wrapper does not know the portfolio's style (Next.js
 * route templates receive no data). motion.css then reads the style from the
 * page's motion scope (`:root:has([data-motion=...])`), so minimal/none still
 * get no page animation.
 */
export const AUTO_PAGE_TRANSITION = "auto";
export type PageTransitionMode = MotionMode | typeof AUTO_PAGE_TRANSITION;

/**
 * View-transition class maps for a mode, or null when page transitions are
 * disabled (minimal / none). Default navigations crossfade; list <-> detail
 * navigations tagged NAV_FORWARD / NAV_BACK slide in that direction.
 */
export function getPageTransitionClasses(mode: PageTransitionMode): PageTransitionClasses | null {
  if (mode !== AUTO_PAGE_TRANSITION && !MOTION_PRESETS[mode].pageTransitions) return null;
  const map = {
    [NAV_FORWARD]: `fc-forward-${mode}`,
    [NAV_BACK]: `fc-back-${mode}`,
    default: `fc-page-${mode}`,
  };
  return { enter: map, exit: map };
}

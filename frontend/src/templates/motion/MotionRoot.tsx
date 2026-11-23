import React from "react";
import type { PortfolioViewData } from "../types";
import { getMotionCssVars, resolveMotionMode, type MotionMode } from "./motionConfig";

type MotionSource = Pick<PortfolioViewData, "animationStyle" | "template"> | null | undefined;

export interface MotionScopeProps {
  "data-motion": MotionMode;
  style?: React.CSSProperties;
}

/**
 * Attributes that turn an existing element into a motion scope (Phase 14):
 * data-motion plus the preset's CSS custom properties. Spreading them onto an
 * element that is already rendered (a page <main>, the site shell root) adds
 * no DOM node, so element trees, layout and existing contracts are unchanged.
 * Deterministic output, so server and client markup always match.
 */
export function motionScopeProps(
  data?: MotionSource,
  templateId?: string | null,
  override?: MotionMode | null
): MotionScopeProps {
  const mode = resolveMotionMode(data?.animationStyle, templateId ?? data?.template, override);
  const vars = getMotionCssVars(mode);
  return Object.keys(vars).length > 0
    ? { "data-motion": mode, style: vars as React.CSSProperties }
    : { "data-motion": mode };
}

export interface MotionRootProps {
  data?: MotionSource;
  templateId?: string | null;
  /** Forces a mode regardless of the portfolio setting (e.g. "none" for thumbnails). */
  animationStyle?: MotionMode | null;
  children?: React.ReactNode;
}

/**
 * Wrapper form of a motion scope for contexts where an extra element is fine
 * (editor preview, gallery). It is `display: contents` (motion.css), so it
 * creates no box and cannot shift layout. Server-safe: no hooks.
 * Scroll reveals run once <MotionRuntime> is mounted on the page.
 */
export function MotionRoot({ data, templateId, animationStyle, children }: MotionRootProps): React.JSX.Element {
  return (
    <div data-motion-wrapper="" {...motionScopeProps(data, templateId, animationStyle)}>
      {children}
    </div>
  );
}

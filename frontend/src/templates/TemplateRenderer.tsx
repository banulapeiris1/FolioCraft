import React from "react";
import { PortfolioViewData, TemplateProps } from "./types";
import { getTemplateDefinition } from "./registry";
import { MotionRoot } from "./motion/MotionRoot";
import type { MotionMode } from "./motion/motionConfig";

export interface TemplateRendererProps extends Pick<TemplateProps, "siteNav" | "getProjectHref"> {
  templateId?: string | null;
  data: PortfolioViewData;
  className?: string;
}

/**
 * TemplateRenderer — Dynamic template rendering engine for FolioCraft portfolios.
 *
 * Responsibilities:
 * 1. Accepts portfolio view data and a template ID.
 * 2. Normalizes the template ID safely (trimming, lowercasing).
 * 3. Resolves the registered template component (or falls back to "modern").
 * 4. Renders the resolved template component with the provided portfolio view data.
 *
 * Guarantees:
 * - Never crashes on null, undefined, empty, or invalid template IDs.
 * - Remains strictly presentational — does not trigger API calls or mutate state.
 */
export function TemplateRenderer({
  templateId,
  data,
  className,
  siteNav,
  getProjectHref,
}: TemplateRendererProps): React.JSX.Element {
  const templateDef = getTemplateDefinition(templateId);
  const TemplateComponent = templateDef.component;

  return (
    <TemplateComponent
      data={data}
      className={className}
      siteNav={siteNav}
      getProjectHref={getProjectHref}
    />
  );
}

export interface AnimatedTemplateRendererProps extends TemplateRendererProps {
  /**
   * Forces a motion mode (e.g. "none" for gallery thumbnails). When omitted,
   * the portfolio's own data.animationStyle is used (default "subtle").
   */
  animationStyle?: MotionMode | null;
}

/**
 * AnimatedTemplateRenderer — TemplateRenderer inside a motion scope (Phase 14).
 *
 * TemplateRenderer itself keeps returning the bare template element (an
 * established contract), so contexts that may add a wrapper element (editor
 * preview, template gallery) use this instead. Public pages apply
 * motionScopeProps() to their existing root element.
 */
export function AnimatedTemplateRenderer({
  animationStyle,
  ...rendererProps
}: AnimatedTemplateRendererProps): React.JSX.Element {
  const templateId = getTemplateDefinition(rendererProps.templateId).meta.id;
  return (
    <MotionRoot data={rendererProps.data} templateId={templateId} animationStyle={animationStyle}>
      <TemplateRenderer {...rendererProps} />
    </MotionRoot>
  );
}

import React from "react";
import { PortfolioViewData } from "./types";
import { getTemplateDefinition } from "./registry";

export interface TemplateRendererProps {
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
}: TemplateRendererProps): React.JSX.Element {
  const templateDef = getTemplateDefinition(templateId);
  const TemplateComponent = templateDef.component;

  return <TemplateComponent data={data} className={className} />;
}

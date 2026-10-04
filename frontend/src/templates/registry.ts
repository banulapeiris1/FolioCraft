import React from "react";
import { PortfolioTemplateId } from "@/types/portfolio";
import { TemplateMeta, TemplateProps } from "./types";
import { TemplateModern } from "./modern/TemplateModern";
import { TemplateMinimal } from "./minimal/TemplateMinimal";
import { TemplateProfessional } from "./professional/TemplateProfessional";

export interface TemplateDefinition {
  meta: TemplateMeta;
  component: React.ComponentType<TemplateProps>;
}

export const DEFAULT_TEMPLATE_ID: PortfolioTemplateId = "modern";

export const TEMPLATE_REGISTRY: Record<PortfolioTemplateId, TemplateDefinition> = {
  modern: {
    meta: {
      id: "modern",
      name: "Modern Developer",
      description: "Tech-stack chips, interactive cards, and vibrant code-focused accents.",
      badge: "Most Popular",
    },
    component: TemplateModern,
  },
  minimal: {
    meta: {
      id: "minimal",
      name: "Minimal Editorial",
      description: "Typography-first layout focused purely on content clarity and elegance.",
    },
    component: TemplateMinimal,
  },
  professional: {
    meta: {
      id: "professional",
      name: "Classic Executive",
      description: "Structured corporate presentation suited for leadership and consultants.",
    },
    component: TemplateProfessional,
  },
};

/**
 * Ordered list of all supported template definitions for iteration and selector components.
 */
export const TEMPLATE_LIST: TemplateDefinition[] = [
  TEMPLATE_REGISTRY.modern,
  TEMPLATE_REGISTRY.minimal,
  TEMPLATE_REGISTRY.professional,
];

/**
 * Type guard to check if an arbitrary string or value is a valid PortfolioTemplateId.
 */
export function isValidTemplateId(id?: string | null): id is PortfolioTemplateId {
  if (!id) return false;
  return Object.prototype.hasOwnProperty.call(TEMPLATE_REGISTRY, id);
}

/**
 * Resolves a template definition by ID, safely falling back to DEFAULT_TEMPLATE_ID ("modern")
 * when templateId is missing, null, undefined, or unrecognized.
 */
export function getTemplateDefinition(templateId?: string | null): TemplateDefinition {
  if (typeof templateId === "string") {
    const normalized = templateId.trim().toLowerCase();
    if (isValidTemplateId(normalized)) {
      return TEMPLATE_REGISTRY[normalized];
    }
  }
  return TEMPLATE_REGISTRY[DEFAULT_TEMPLATE_ID];
}

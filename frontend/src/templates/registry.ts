import React from "react";
import { PortfolioTemplateId } from "@/types/portfolio";
import { TemplateCategory, TemplateMeta, TemplateProps } from "./types";
import { TemplateModern } from "./modern/TemplateModern";
import { TemplateMinimal } from "./minimal/TemplateMinimal";
import { TemplateProfessional } from "./professional/TemplateProfessional";
import { TemplateEditorial } from "./editorial/TemplateEditorial";
import { TemplateBento } from "./bento/TemplateBento";
import { TemplateStudio } from "./studio/TemplateStudio";
import { TemplateExecutive } from "./executive/TemplateExecutive";
import { TemplateShowcase } from "./showcase/TemplateShowcase";
import { TemplateAcademic } from "./academic/TemplateAcademic";

export interface TemplateDefinition {
  meta: TemplateMeta;
  component: React.ComponentType<TemplateProps>;
}

export const DEFAULT_TEMPLATE_ID: PortfolioTemplateId = "modern";

export interface TemplateCategoryInfo {
  id: TemplateCategory;
  label: string;
}

/**
 * Template categories in display order (Phase 13). Every registered template
 * belongs to exactly one category.
 */
export const TEMPLATE_CATEGORIES: TemplateCategoryInfo[] = [
  { id: "developer", label: "Developer" },
  { id: "minimal", label: "Minimal" },
  { id: "professional", label: "Professional" },
  { id: "creative", label: "Creative" },
  { id: "academic", label: "Academic" },
];

export function getTemplateCategoryLabel(category: TemplateCategory): string {
  return TEMPLATE_CATEGORIES.find((c) => c.id === category)?.label ?? category;
}

/** A registry entry: same as TemplateDefinition but the category is mandatory. */
export interface RegisteredTemplateDefinition extends TemplateDefinition {
  meta: TemplateMeta & { category: TemplateCategory };
}

export const TEMPLATE_REGISTRY: Record<PortfolioTemplateId, RegisteredTemplateDefinition> = {
  modern: {
    meta: {
      id: "modern",
      name: "Modern Developer",
      description: "Tech-stack chips, interactive cards, and vibrant code-focused accents.",
      category: "developer",
      badge: "Most Popular",
    },
    component: TemplateModern,
  },
  minimal: {
    meta: {
      id: "minimal",
      name: "Minimal Editorial",
      description: "Typography-first layout focused purely on content clarity and elegance.",
      category: "minimal",
    },
    component: TemplateMinimal,
  },
  professional: {
    meta: {
      id: "professional",
      name: "Classic Executive",
      description: "Structured corporate presentation suited for leadership and consultants.",
      category: "professional",
    },
    component: TemplateProfessional,
  },

  // ---- Phase 13: Advanced Template Collection ----
  editorial: {
    meta: {
      id: "editorial",
      name: "Editorial",
      description: "Magazine-style layout with oversized serif headlines, a drop-cap introduction, and a ruled index of work.",
      category: "minimal",
    },
    component: TemplateEditorial,
  },
  bento: {
    meta: {
      id: "bento",
      name: "Bento Developer",
      description: "Asymmetric bento grid of tiles: profile, live stats, featured project, skills cloud, and mini timeline.",
      category: "developer",
      badge: "New",
    },
    component: TemplateBento,
  },
  studio: {
    meta: {
      id: "studio",
      name: "Creative Studio",
      description: "Bold agency look with oversized type, a scrolling skills band, and alternating full-bleed project showcases.",
      category: "creative",
    },
    component: TemplateStudio,
  },
  executive: {
    meta: {
      id: "executive",
      name: "Executive Suite",
      description: "Sticky profile sidebar with core competencies, key figures, and a tenure-led career history.",
      category: "professional",
    },
    component: TemplateExecutive,
  },
  showcase: {
    meta: {
      id: "showcase",
      name: "Project Showcase",
      description: "Project-first layout: featured spotlight, repo-style cards with tech dots, and a built-with index.",
      category: "developer",
    },
    component: TemplateShowcase,
  },
  academic: {
    meta: {
      id: "academic",
      name: "Academic CV",
      description: "Typeset curriculum-vitae layout with section rails and numbered, citation-style project entries.",
      category: "academic",
    },
    component: TemplateAcademic,
  },
};

/**
 * Ordered list of all supported template definitions for iteration and selector components.
 */
export const TEMPLATE_LIST: RegisteredTemplateDefinition[] = [
  TEMPLATE_REGISTRY.modern,
  TEMPLATE_REGISTRY.minimal,
  TEMPLATE_REGISTRY.professional,
  TEMPLATE_REGISTRY.editorial,
  TEMPLATE_REGISTRY.bento,
  TEMPLATE_REGISTRY.studio,
  TEMPLATE_REGISTRY.executive,
  TEMPLATE_REGISTRY.showcase,
  TEMPLATE_REGISTRY.academic,
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
export function getTemplateDefinition(templateId?: string | null): RegisteredTemplateDefinition {
  if (typeof templateId === "string") {
    const normalized = templateId.trim().toLowerCase();
    if (isValidTemplateId(normalized)) {
      return TEMPLATE_REGISTRY[normalized];
    }
  }
  return TEMPLATE_REGISTRY[DEFAULT_TEMPLATE_ID];
}

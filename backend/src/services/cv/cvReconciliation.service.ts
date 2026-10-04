import type {
  Confidence,
  CvLayoutAnalysis,
  EntitySource,
  ReviewIssue,
  StructuredCvData,
  StructuredCvExtracurricular,
  StructuredCvProject,
} from "../../types/cv.types";
import type { GeminiParsedCvResult } from "./cvAiParser.service";

export interface ReconciliationOptions {
  deterministic: StructuredCvData;
  layout: CvLayoutAnalysis;
  geminiResult?: GeminiParsedCvResult;
  geminiReason?: string;
  geminiError?: string;
}

export interface ReconciledCvResult {
  structured: StructuredCvData;
  reconciliationNotes: string[];
  conflictsDetected: string[];
}

/**
 * Reconciles deterministic extraction results with visual layout analysis
 * and Gemini multimodal AI second opinions.
 *
 * Precedence hierarchy:
 * 1. Visual section headings and spatial layout context
 * 2. Deterministic + Gemini agreement (highest confidence)
 * 3. Gemini suggestion supported by visual heading or entity signals
 * 4. Deterministic extraction if Gemini is unavailable or disagrees without layout evidence
 * 5. Ambiguities flagged with actionable ReviewIssue warnings
 */
export function reconcileCvExtraction(
  options: ReconciliationOptions
): ReconciledCvResult {
  const { deterministic, layout, geminiResult, geminiReason, geminiError } =
    options;

  const reconciliationNotes: string[] = [];
  const conflictsDetected: string[] = [];
  const reviewIssues: ReviewIssue[] = [
    ...(deterministic.reviewIssues || []),
  ];

  // Deep clone projects and extracurricular from deterministic result
  let reconciledProjects: StructuredCvProject[] = [
    ...(deterministic.projects || []),
  ];
  let reconciledExtracurricular: StructuredCvExtracurricular[] = [
    ...(deterministic.extracurricular ||
      deterministic.extracurricularActivities ||
      []),
  ];

  // Set default sources for deterministic entities if not present
  reconciledProjects = reconciledProjects.map((p) => ({
    ...p,
    source: p.source || {
      section: "Projects",
      text: p.title,
      classifier: "deterministic",
      confidence: p.confidence || "medium",
    },
  }));

  reconciledExtracurricular = reconciledExtracurricular.map((e) => ({
    ...e,
    source: e.source || {
      section: "Extracurricular Activities",
      text: e.activity,
      classifier: "deterministic",
      confidence: e.confidence || "high",
    },
  }));

  // Visual headings map for quick layout lookup
  const visualHeadingTexts = layout.visualHeadings.map((h) =>
    h.text.toLowerCase().trim()
  );
  const hasVisualExtracurricularHeading = visualHeadingTexts.some((vh) =>
    /^(?:extra-?curricular|activities|societies|clubs|volunteering)/i.test(vh)
  );
  const hasVisualProjectsHeading = visualHeadingTexts.some((vh) =>
    /^(?:projects|technical projects|software projects)/i.test(vh)
  );

  // If Gemini was called and returned structured data, perform entity-level reconciliation
  if (geminiResult) {
    reconciliationNotes.push(
      `Gemini multimodal second opinion integrated: ${geminiReason || "Ambiguity resolution"}`
    );

    // 1. Reconcile Projects vs Extracurricular Activities
    if (geminiResult.extracurricular && geminiResult.extracurricular.length > 0) {
      for (const geminiExtra of geminiResult.extracurricular) {
        const extraTitle = (
          geminiExtra.activity ||
          geminiExtra.title ||
          ""
        ).trim();
        if (!extraTitle) continue;

        // Check if deterministic parser put this in projects
        const matchingProjectIdx = reconciledProjects.findIndex(
          (p) =>
            p.title.toLowerCase().trim() === extraTitle.toLowerCase() ||
            p.title.toLowerCase().includes(extraTitle.toLowerCase()) ||
            extraTitle.toLowerCase().includes(p.title.toLowerCase())
        );

        if (matchingProjectIdx !== -1) {
          const matchedProject = reconciledProjects[matchingProjectIdx]!;

          // Evidence analysis:
          // Does the project have code repository or live deployment?
          const hasHardTechEvidence =
            Boolean(matchedProject.githubUrl) ||
            Boolean(matchedProject.liveUrl);

          if (hasHardTechEvidence) {
            // Hard project evidence conflicts with Gemini extracurricular classification
            conflictsDetected.push(
              `Conflict on "${matchedProject.title}": Deterministic parser found GitHub/Live URL, while AI suggested Extracurricular. Retained as Project.`
            );
            reviewIssues.push({
              field: "projects",
              section: "projects",
              message: `AI suggested "${matchedProject.title}" might be an Extracurricular Activity, but code repository links were found. Retained as Project for review.`,
              severity: "warning",
            });
            matchedProject.confidence = "medium";
          } else {
            // Reclassify to extracurricular
            const finalConfidence: Confidence = hasVisualExtracurricularHeading
              ? "high"
              : "medium";

            reconciledProjects.splice(matchingProjectIdx, 1);
            reconciledExtracurricular.push({
              activity: matchedProject.title,
              role: geminiExtra.role,
              organization: geminiExtra.organization,
              startDate: geminiExtra.startDate,
              endDate: geminiExtra.endDate,
              description:
                geminiExtra.description || matchedProject.description,
              confidence: finalConfidence,
              source: {
                section: hasVisualExtracurricularHeading
                  ? "Extracurricular (Visual Heading)"
                  : "Extracurricular (AI + Heuristic)",
                text: matchedProject.title,
                classifier: "reconciled",
                confidence: finalConfidence,
              },
            });

            reconciliationNotes.push(
              `Reclassified "${matchedProject.title}" from Projects to Extracurricular based on AI & Layout agreement.`
            );

            reviewIssues.push({
              field: "extracurricular",
              section: "extracurricular",
              message: `"${matchedProject.title}" was classified as an Extracurricular Activity (AI second opinion).`,
              severity: "info",
            });
          }
        } else {
          // New extracurricular activity found by Gemini that was missed entirely
          const alreadyExists = reconciledExtracurricular.some(
            (e) =>
              e.activity.toLowerCase().trim() ===
              extraTitle.toLowerCase().trim()
          );

          if (!alreadyExists) {
            reconciledExtracurricular.push({
              activity: extraTitle,
              role: geminiExtra.role,
              organization: geminiExtra.organization,
              startDate: geminiExtra.startDate,
              endDate: geminiExtra.endDate,
              description: geminiExtra.description,
              confidence: "medium",
              source: {
                section: "Extracurricular (AI Multimodal)",
                text: extraTitle,
                classifier: "gemini",
                confidence: "medium",
              },
            });
            reconciliationNotes.push(
              `Added extracurricular activity "${extraTitle}" detected by Gemini multimodal analysis.`
            );
          }
        }
      }
    }

    // 2. Reconcile Projects: confirm AI projects that match deterministic projects
    if (geminiResult.projects && geminiResult.projects.length > 0) {
      for (const geminiProj of geminiResult.projects) {
        const projTitle = (geminiProj.title || "").trim();
        if (!projTitle) continue;

        const matched = reconciledProjects.find(
          (p) =>
            p.title.toLowerCase().trim() === projTitle.toLowerCase() ||
            p.title.toLowerCase().includes(projTitle.toLowerCase()) ||
            projTitle.toLowerCase().includes(p.title.toLowerCase())
        );

        if (matched) {
          // Agreement boosts confidence!
          matched.confidence = "high";
          matched.source = {
            section: "Projects",
            text: matched.title,
            classifier: "reconciled",
            confidence: "high",
          };
          if (!matched.description && geminiProj.description) {
            matched.description = geminiProj.description;
          }
          if (
            (!matched.technologies || matched.technologies.length === 0) &&
            geminiProj.technologies &&
            geminiProj.technologies.length > 0
          ) {
            matched.technologies = geminiProj.technologies;
          }
        }
      }
    }

    // 3. Record any conflicts reported by Gemini
    if (geminiResult.conflicts && geminiResult.conflicts.length > 0) {
      for (const c of geminiResult.conflicts) {
        conflictsDetected.push(c);
        reviewIssues.push({
          field: "cv",
          section: "projects",
          message: c,
          severity: "info",
        });
      }
    }
  } else if (geminiError) {
    // Gemini was attempted or requested but failed/unavailable
    reconciliationNotes.push(
      `Deterministic parsing preserved without AI: ${geminiError}`
    );
    reviewIssues.push({
      field: "cv",
      section: "summary",
      message:
        "Multimodal AI second opinion was unavailable. Parsed using deterministic rules.",
      severity: "info",
    });
  }

  // 4. Layout-aware tagging: if layout is two-column or sidebar
  if (layout.layoutType !== "single-column" || layout.sidebar.detected) {
    reconciliationNotes.push(
      `Layout structure reconciled: ${layout.layoutType}${
        layout.sidebar.detected
          ? ` (${layout.sidebar.position} sidebar, ~${Math.round(
              (layout.sidebar.widthRatio || 0) * 100
            )}% width)`
          : ""
      }`
    );
  }

  // 5. Final Structured CV Data assemble
  const finalStructured: StructuredCvData = {
    ...deterministic,
    projects: reconciledProjects,
    extracurricular:
      reconciledExtracurricular.length > 0
        ? reconciledExtracurricular
        : undefined,
    extracurricularActivities:
      reconciledExtracurricular.length > 0
        ? reconciledExtracurricular
        : undefined,
    reviewIssues: reviewIssues.length > 0 ? reviewIssues : undefined,
    parsingMetadata: {
      parserVersion: "2.0-hybrid",
      layoutType: layout.layoutType,
      hasSidebar: layout.sidebar.detected,
      visualHeadingsDetected: layout.visualHeadings.map((h) => h.text),
      geminiUsed: Boolean(geminiResult),
      geminiReason: geminiReason,
      conflictsCount: conflictsDetected.length,
      reconciliationNotes,
    },
  };

  return {
    structured: finalStructured,
    reconciliationNotes,
    conflictsDetected,
  };
}

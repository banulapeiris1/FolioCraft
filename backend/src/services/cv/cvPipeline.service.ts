import { extractTextFromPdf } from "../pdfExtraction.service";
import { detectCvSections } from "../sectionDetection.service";
import { extractStructuredCv } from "../structuredExtraction.service";
import type {
  CvLayoutAnalysis,
  StructuredCvData,
} from "../../types/cv.types";
import { analyzeCvLayout } from "./cvLayout.service";
import {
  executeGeminiMultimodalCvParse,
  type GeminiCvClient,
} from "./cvAiParser.service";
import { reconcileCvExtraction } from "./cvReconciliation.service";
import {
  executeLlmCvExtraction,
  isLlmExtractionConfigured,
  type CvLlmClient,
} from "./cvLlmExtraction.service";

export interface HybridCvPipelineOptions {
  geminiClient?: GeminiCvClient;
  forceGemini?: boolean;
  /**
   * Full-document LLM extractor. Used automatically when GEMINI_API_KEY is set
   * and no legacy geminiClient mock is injected.
   */
  llmClient?: CvLlmClient;
}

export interface HybridCvPipelineResult {
  rawText: string;
  structuredData: StructuredCvData;
  layout: CvLayoutAnalysis;
  geminiUsed: boolean;
}

/**
 * Executes the complete Hybrid CV Parsing Pipeline:
 *
 * 1. Text Extraction (unpdf preserves line order and exact characters)
 * 2. Visual / Layout Extraction (detects columns, sidebars, spatial visual headings)
 * 3. Deterministic Section & Entity Parsing (baseline high-speed structured extraction)
 * 4. Multimodal AI Second Opinion when ambiguity / complex layout is detected
 * 5. Layout & AI Reconciliation (visual context precedence, confidence calibration)
 * 6. Review Issue generation (needs_review flags for human confirmation)
 */
export async function executeHybridCvPipeline(
  pdfBuffer: Buffer,
  options?: HybridCvPipelineOptions
): Promise<HybridCvPipelineResult> {
  // Ensure an isolated Buffer instance so external callers never experience side effects
  const safePdfBuffer = Buffer.from(pdfBuffer);

  // Safe observability logging (never logs CV text or secrets)
  const startTime = Date.now();
  if (process.env.NODE_ENV !== "test") {
    console.log("[CV-Pipeline] CV processing started");
  }

  // Step 1: Text extraction
  const extraction = await extractTextFromPdf(safePdfBuffer);
  if (process.env.NODE_ENV !== "test") {
    console.log(
      `[CV-Pipeline] Text extraction completed: ${extraction.totalPages} page(s), ${extraction.text.length} chars`
    );
  }

  // Step 2: Visual & layout extraction
  const layout = await analyzeCvLayout(safePdfBuffer);
  if (process.env.NODE_ENV !== "test") {
    console.log(
      `[CV-Pipeline] Layout analysis completed: type=${layout.layoutType}, sidebar=${layout.sidebar.detected}, visualHeadings=${layout.visualHeadings.length}`
    );
  }

  // Step 3: Deterministic section detection & structured entity extraction
  const sections = detectCvSections(extraction.text);
  const deterministic = extractStructuredCv(sections);
  deterministic.totalPages = extraction.totalPages;
  deterministic.pageTexts = extraction.pages;
  if (process.env.NODE_ENV !== "test") {
    console.log("[CV-Pipeline] Deterministic parser completed");
  }

  // Step 4a: Full-document LLM extraction (primary path when configured).
  // Falls back to the deterministic + second-opinion flow below on failure.
  const useLlmExtraction =
    Boolean(options?.llmClient) ||
    (!options?.geminiClient && isLlmExtractionConfigured());

  let llmError: string | undefined;
  if (useLlmExtraction) {
    const llm = await executeLlmCvExtraction({
      pdfBuffer: safePdfBuffer,
      pageTexts: extraction.pages,
      rawText: extraction.text,
      client: options?.llmClient,
    });

    if (llm.structured) {
      const structuredData = llm.structured;
      structuredData.totalPages = extraction.totalPages;
      structuredData.pageTexts = extraction.pages;
      structuredData.parsingMetadata = {
        parserVersion: "3.0-llm",
        layoutType: layout.layoutType,
        hasSidebar: layout.sidebar.detected,
        visualHeadingsDetected: layout.visualHeadings.map((h) => h.text),
        geminiUsed: true,
        geminiReason: "Full-document LLM extraction",
      };
      if (process.env.NODE_ENV !== "test") {
        console.log(
          `[CV-Pipeline] LLM extraction completed in ${Date.now() - startTime}ms`
        );
      }
      return {
        rawText: extraction.text,
        structuredData,
        layout,
        geminiUsed: true,
      };
    }

    llmError = llm.error;
    if (process.env.NODE_ENV !== "test") {
      console.warn(
        `[CV-Pipeline] LLM extraction failed, falling back to deterministic parser: ${llm.error}`
      );
    }
  }

  // Step 4b: Selective Gemini multimodal second opinion
  const pageTextsForAi = extraction.pages.map((text, idx) => ({
    pageNumber: idx + 1,
    text,
  }));

  const geminiExecution = await executeGeminiMultimodalCvParse({
    pdfBuffer: safePdfBuffer,
    layout,
    deterministic,
    pageTexts: pageTextsForAi,
    client: options?.geminiClient,
  });

  if (process.env.NODE_ENV !== "test") {
    console.log(
      `[CV-Pipeline] Gemini required: ${geminiExecution.called ? "yes" : "no"}${
        geminiExecution.reason ? ` (${geminiExecution.reason})` : ""
      }`
    );
  }

  // Step 5: Reconciliation between deterministic, visual layout, and AI results
  const reconciliation = reconcileCvExtraction({
    deterministic,
    layout,
    geminiResult: geminiExecution.geminiResult,
    geminiReason: geminiExecution.reason,
    geminiError: geminiExecution.error,
  });

  const structuredData = reconciliation.structured;
  if (llmError) {
    structuredData.reviewIssues = [
      ...(structuredData.reviewIssues || []),
      {
        field: "cv",
        section: "summary",
        message:
          "AI extraction was unavailable, so this CV was parsed with basic rules. Please review every section carefully.",
        severity: "warning",
      },
    ];
  }
  structuredData.totalPages = extraction.totalPages;
  structuredData.pageTexts = extraction.pages;

  if (process.env.NODE_ENV !== "test") {
    console.log(
      `[CV-Pipeline] Reconciliation completed in ${Date.now() - startTime}ms: reviewIssues=${
        structuredData.reviewIssues?.length || 0
      }`
    );
  }

  return {
    rawText: extraction.text,
    structuredData,
    layout,
    geminiUsed: geminiExecution.called,
  };
}

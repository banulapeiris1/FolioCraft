import { extractTextItems, renderPageAsImage } from "unpdf";
import type { CvLayoutAnalysis, VisualHeading } from "../../types/cv.types";

export type { CvLayoutAnalysis, VisualHeading };
export type LayoutAnalysisResult = CvLayoutAnalysis;

export interface TextItemWithBounds {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily?: string;
}

export interface ColumnLayout {
  type: "single-column" | "two-column" | "multi-column" | "sidebar";
  columnCount: number;
  hasSidebar: boolean;
  sidebarPosition?: "left" | "right";
  leftColumnRatio?: number;
}

export interface VisualBlock {
  page: number;
  column: number;
  startY: number;
  endY: number;
  lines: string[];
  heading?: string;
}

/**
 * Deterministically analyzes the visual structure of a PDF:
 * - Detects columns (single, two-column, sidebar)
 * - Identifies visual headings by relative font size and positioning
 * - Groups content into spatial visual blocks
 */
export async function analyzeCvLayout(
  pdfBuffer: Buffer
): Promise<CvLayoutAnalysis> {
  // Allocate independent Uint8Array copy so unpdf/pdfjs worker transfers do not detach caller buffer
  const uint8Array = new Uint8Array(pdfBuffer.length);
  uint8Array.set(pdfBuffer);

  let items: TextItemWithBounds[] = [];
  let totalPages = 1;
  try {
    const raw = (await extractTextItems(uint8Array)) as {
      totalPages?: number;
      items?: unknown;
    };
    totalPages = raw.totalPages || 1;
    if (Array.isArray(raw.items)) {
      items = (raw.items.flat() as TextItemWithBounds[]).filter(Boolean);
    }
  } catch {
    return {
      totalPages: 1,
      layoutType: "single-column",
      columnCount: 1,
      columns: [{ columnIndex: 0, left: 0, right: 595, width: 595, blockCount: 0 }],
      sidebar: { detected: false },
      visualHeadings: [],
      medianFontSize: 12,
    };
  }

  if (items.length === 0) {
    return {
      totalPages,
      layoutType: "single-column",
      columnCount: 1,
      columns: [{ columnIndex: 0, left: 0, right: 595, width: 595, blockCount: 0 }],
      sidebar: { detected: false },
      visualHeadings: [],
      medianFontSize: 12,
    };
  }

  // 1. Calculate font sizes and determine median body font
  const fontSizes = items
    .map((i) => i.fontSize)
    .filter((s) => s > 0)
    .sort((a, b) => a - b);
  const medianFontSize =
    fontSizes[Math.floor(fontSizes.length / 2)] || 10;

  // 2. Detect column structure from horizontal x coordinates
  const validItems = items.filter(
    (i) => i && typeof i.str === "string" && i.str.trim().length > 0
  );

  const xPositions = validItems
    .filter((i) => i.str.trim().length > 3)
    .map((i) => i.x);

  const minX = xPositions.length > 0 ? Math.min(...xPositions) : 0;
  const maxX = xPositions.length > 0 ? Math.max(...xPositions) : 595;
  const widthSpan = maxX - minX;

  // Check for multi-column clustering
  let layoutType: ColumnLayout["type"] = "single-column";
  let columnCount = 1;
  let hasSidebar = false;
  let sidebarPosition: "left" | "right" | undefined;
  let leftRatio = 1.0;

  if (widthSpan > 150 && validItems.length >= 10) {
    const midX = minX + widthSpan * 0.45;
    const leftItems = validItems.filter((i) => i.x < midX);
    const rightItems = validItems.filter((i) => i.x >= midX);

    const leftDensity = leftItems.length / validItems.length;
    const rightDensity = rightItems.length / validItems.length;

    // Both sides must contain meaningful content (at least 15% on each side)
    if (leftDensity >= 0.15 && rightDensity >= 0.15) {
      columnCount = 2;
      leftRatio = leftDensity;

      // Sidebar heuristic: one column occupies <= 40% of text density
      if (leftDensity <= 0.40) {
        hasSidebar = true;
        sidebarPosition = "left";
        layoutType = "sidebar";
      } else if (rightDensity <= 0.40) {
        hasSidebar = true;
        sidebarPosition = "right";
        layoutType = "sidebar";
      } else {
        layoutType = "two-column";
      }
    }
  }

  // 3. Identify visual headings by font size >= 1.25x median body font, or uppercase
  const headings: VisualHeading[] = [];
  const headingThreshold = Math.max(12, medianFontSize * 1.2);

  for (const item of validItems) {
    const trimmed = item.str.trim();
    if (trimmed.length < 3 || trimmed.length > 40) continue;

    const isLarge = item.fontSize >= headingThreshold;
    const isUppercase =
      trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed) && trimmed.length >= 4;

    if (isLarge || (isUppercase && item.fontSize >= medianFontSize)) {
      headings.push({
        text: trimmed,
        x: Math.round(item.x),
        y: Math.round(item.y),
        fontSize: Math.round(item.fontSize),
        page: 1, // First page headings
        isBold: isLarge,
      });
    }
  }

  return {
    totalPages,
    layoutType,
    columnCount,
    columns: [
      {
        columnIndex: 0,
        left: minX,
        right: columnCount > 1 ? minX + widthSpan * 0.45 : maxX,
        width: columnCount > 1 ? widthSpan * 0.45 : widthSpan,
        blockCount: validItems.length,
      },
      ...(columnCount > 1
        ? [
            {
              columnIndex: 1,
              left: minX + widthSpan * 0.45,
              right: maxX,
              width: widthSpan * 0.55,
              blockCount: validItems.length,
            },
          ]
        : []),
    ],
    sidebar: {
      detected: hasSidebar,
      position: sidebarPosition,
      widthRatio: Number(leftRatio.toFixed(2)),
    },
    visualHeadings: headings,
    medianFontSize,
  };
}

/**
 * Renders a specific page of an in-memory PDF Buffer into a PNG Buffer for visual/multimodal analysis.
 * Uses unpdf and @napi-rs/canvas in-memory with zero disk persistence.
 */
export async function renderCvPageImage(
  pdfBuffer: Buffer,
  pageNumber: number = 1
): Promise<Buffer> {
  // Allocate independent Uint8Array copy so unpdf/pdfjs worker transfers do not detach caller buffer
  const uint8Array = new Uint8Array(pdfBuffer.length);
  uint8Array.set(pdfBuffer);

  const rawImage = await renderPageAsImage(uint8Array, pageNumber, {
    canvasImport: () => import("@napi-rs/canvas"),
    scale: 1.5, // Crisp 1.5x resolution for AI readability without excessive payload size
  });

  return Buffer.from(rawImage);
}

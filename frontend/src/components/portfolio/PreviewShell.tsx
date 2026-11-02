"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { PortfolioTemplateId } from "@/types/portfolio";
import { PortfolioViewData } from "@/templates/types";
import { TemplateRenderer } from "@/templates/TemplateRenderer";
import {
  MonitorIcon,
  TabletIcon,
  SmartphoneIcon,
  ZoomInIcon,
  ZoomOutIcon,
  RotateCcwIcon,
  Maximize2Icon,
} from "./PortfolioIcons";

export type PreviewDevice = "desktop" | "tablet" | "mobile";

export interface PreviewShellProps {
  data: PortfolioViewData;
  templateId?: PortfolioTemplateId | string | null;
  initialDevice?: PreviewDevice;
  initialZoom?: number;
  showControls?: boolean;
  onDeviceChange?: (device: PreviewDevice) => void;
  onZoomChange?: (zoom: number) => void;
  className?: string;
  portfolioId?: string;
  onTemplateChange?: (templateId: PortfolioTemplateId) => void;
}

export const DEVICE_WIDTHS: Record<PreviewDevice, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 1.5;
export const ZOOM_STEP = 0.1;

/**
 * PreviewShell — Responsive preview wrapper with device viewport emulation
 * and zoom/fit controls for FolioCraft portfolio templates.
 *
 * Requirements:
 * - Accurately emulates Desktop, Tablet (768px), and Mobile (375px) viewports.
 * - Zoom in/out within [0.5, 1.5] scale limits without altering portfolio data.
 * - Fits to width dynamically when requested.
 * - Contained scrolling to protect editor scroll positions.
 * - Accessible controls (role="toolbar", aria-pressed, descriptive labels).
 */
export function PreviewShell({
  data,
  templateId,
  initialDevice = "desktop",
  initialZoom = 1.0,
  showControls = true,
  onDeviceChange,
  onZoomChange,
  className = "",
  onTemplateChange,
}: PreviewShellProps): React.JSX.Element {
  const [device, setDevice] = useState<PreviewDevice>(initialDevice);
  const [zoom, setZoom] = useState<number>(initialZoom);
  const [isFitToWidth, setIsFitToWidth] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeTemplate = (templateId || data.template || "modern") as PortfolioTemplateId;

  // Handle device change
  const handleDeviceSelect = useCallback(
    (newDevice: PreviewDevice) => {
      setDevice(newDevice);
      setIsFitToWidth(false);
      onDeviceChange?.(newDevice);
    },
    [onDeviceChange]
  );

  // Zoom helpers
  const handleZoomIn = useCallback(() => {
    setIsFitToWidth(false);
    setZoom((prev) => {
      const next = Math.min(MAX_ZOOM, Math.round((prev + ZOOM_STEP) * 10) / 10);
      onZoomChange?.(next);
      return next;
    });
  }, [onZoomChange]);

  const handleZoomOut = useCallback(() => {
    setIsFitToWidth(false);
    setZoom((prev) => {
      const next = Math.max(MIN_ZOOM, Math.round((prev - ZOOM_STEP) * 10) / 10);
      onZoomChange?.(next);
      return next;
    });
  }, [onZoomChange]);

  const handleResetZoom = useCallback(() => {
    setIsFitToWidth(false);
    setZoom(1.0);
    onZoomChange?.(1.0);
  }, [onZoomChange]);

  // Fit to container width calculation
  const handleFitToWidth = useCallback(() => {
    if (!containerRef.current) return;
    const availableWidth = containerRef.current.clientWidth - 48; // padding
    const targetWidth = device === "mobile" ? 375 : device === "tablet" ? 768 : 1200;

    if (availableWidth > 0 && targetWidth > 0) {
      const calculatedScale = Math.min(1.0, Math.max(MIN_ZOOM, availableWidth / targetWidth));
      const rounded = Math.round(calculatedScale * 100) / 100;
      setZoom(rounded);
      setIsFitToWidth(true);
      onZoomChange?.(rounded);
    }
  }, [device, onZoomChange]);

  // Recalculate fit on resize if fit mode is active
  useEffect(() => {
    if (!isFitToWidth) return;
    const handleResize = () => {
      handleFitToWidth();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isFitToWidth, handleFitToWidth]);

  return (
    <div
      data-testid="preview-shell"
      className={`flex flex-col bg-slate-900/5 rounded-2xl border border-[#eae6f5] overflow-hidden ${className}`}
    >
      {/* Shell Controls Toolbar */}
      {showControls && (
        <header
          role="toolbar"
          aria-label="Preview display controls"
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-white border-b border-[#eae6f5] select-none text-xs"
        >
          {/* Left: Status & Active Template */}
          <div className="flex items-center gap-2.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f3f0ff] border border-[#dcd3f8] font-semibold text-[#6e56cf]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Preview</span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-[#64748b]">
              <span className="font-medium">Template:</span>
              <span className="font-semibold text-[#0f172a] capitalize">
                {activeTemplate}
              </span>
            </div>
          </div>

          {/* Center: Device Viewport Switcher */}
          <div
            data-testid="device-controls"
            className="flex items-center gap-1 bg-[#f8f7fd] p-1 rounded-xl border border-[#eae6f5]"
          >
            <button
              type="button"
              data-testid="device-btn-desktop"
              aria-label="Desktop viewport"
              aria-pressed={device === "desktop"}
              onClick={() => handleDeviceSelect("desktop")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                device === "desktop"
                  ? "bg-white text-[#6e56cf] shadow-xs font-semibold"
                  : "text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              <MonitorIcon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Desktop</span>
            </button>

            <button
              type="button"
              data-testid="device-btn-tablet"
              aria-label="Tablet viewport (768px)"
              aria-pressed={device === "tablet"}
              onClick={() => handleDeviceSelect("tablet")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                device === "tablet"
                  ? "bg-white text-[#6e56cf] shadow-xs font-semibold"
                  : "text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              <TabletIcon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Tablet</span>
            </button>

            <button
              type="button"
              data-testid="device-btn-mobile"
              aria-label="Mobile viewport (375px)"
              aria-pressed={device === "mobile"}
              onClick={() => handleDeviceSelect("mobile")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                device === "mobile"
                  ? "bg-white text-[#6e56cf] shadow-xs font-semibold"
                  : "text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              <SmartphoneIcon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Mobile</span>
            </button>
          </div>

          {/* Right: Zoom & Fit Controls */}
          <div
            data-testid="zoom-controls"
            className="flex items-center gap-1.5"
          >
            <div className="flex items-center bg-[#f8f7fd] rounded-xl border border-[#eae6f5] p-0.5">
              <button
                type="button"
                data-testid="zoom-out-btn"
                aria-label="Zoom out"
                disabled={zoom <= MIN_ZOOM}
                onClick={handleZoomOut}
                className="p-1.5 rounded-lg text-[#64748b] hover:text-[#0f172a] hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-all"
              >
                <ZoomOutIcon className="w-3.5 h-3.5" />
              </button>

              <span
                data-testid="zoom-value-label"
                className="px-2 font-mono text-[11px] font-semibold text-[#475569] min-w-[42px] text-center"
              >
                {Math.round(zoom * 100)}%
              </span>

              <button
                type="button"
                data-testid="zoom-in-btn"
                aria-label="Zoom in"
                disabled={zoom >= MAX_ZOOM}
                onClick={handleZoomIn}
                className="p-1.5 rounded-lg text-[#64748b] hover:text-[#0f172a] hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-all"
              >
                <ZoomInIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              data-testid="zoom-reset-btn"
              aria-label="Reset zoom"
              title="Reset Zoom (100%)"
              onClick={handleResetZoom}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                zoom === 1.0 && !isFitToWidth
                  ? "border-[#dcd3f8] bg-[#f3f0ff] text-[#6e56cf]"
                  : "border-[#eae6f5] bg-white text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              <RotateCcwIcon className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              data-testid="zoom-fit-btn"
              aria-label="Fit to width"
              title="Fit to Width"
              onClick={handleFitToWidth}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                isFitToWidth
                  ? "border-[#dcd3f8] bg-[#f3f0ff] text-[#6e56cf]"
                  : "border-[#eae6f5] bg-white text-[#64748b] hover:text-[#0f172a]"
              }`}
            >
              <Maximize2Icon className="w-3.5 h-3.5" />
            </button>

            {onTemplateChange && (
              <div className="hidden lg:flex items-center gap-1 border-l border-[#eae6f5] pl-2 ml-1">
                {(["modern", "minimal", "professional"] as PortfolioTemplateId[]).map((tId) => (
                  <button
                    key={tId}
                    type="button"
                    onClick={() => onTemplateChange(tId)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono capitalize transition-all cursor-pointer ${
                      activeTemplate === tId
                        ? "bg-[#6e56cf] text-white font-bold"
                        : "bg-white text-[#64748b] hover:bg-[#f3f0ff] border border-[#eae6f5]"
                    }`}
                  >
                    {tId}
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>
      )}

      {/* Viewport Canvas Area */}
      <div
        ref={containerRef}
        data-testid="preview-viewport-canvas"
        className="relative flex-1 overflow-auto p-4 sm:p-6 flex justify-center bg-[#f1edf9]/50 min-h-[500px]"
      >
        <div
          data-testid="preview-device-frame"
          className={`transition-all duration-200 origin-top flex flex-col ${
            device === "desktop"
              ? "w-full max-w-full bg-white rounded-xl shadow-sm border border-[#eae6f5]"
              : device === "tablet"
              ? "w-[768px] min-h-[1024px] bg-white rounded-3xl border-8 border-slate-800 shadow-2xl overflow-hidden"
              : "w-[375px] min-h-[720px] bg-white rounded-[36px] border-8 border-slate-900 shadow-2xl overflow-hidden relative"
          }`}
          style={{
            transform: zoom !== 1.0 ? `scale(${zoom})` : undefined,
            transformOrigin: "top center",
          }}
        >
          {/* Mobile Notch Bar */}
          {device === "mobile" && (
            <div
              data-testid="mobile-notch-indicator"
              className="w-full bg-slate-900 h-6 flex items-center justify-center shrink-0 z-10"
              aria-hidden="true"
            >
              <div className="w-24 h-3.5 bg-black rounded-b-xl" />
            </div>
          )}

          {/* Tablet Speaker Notch */}
          {device === "tablet" && (
            <div
              data-testid="tablet-speaker-indicator"
              className="w-full bg-slate-800 h-4 flex items-center justify-center shrink-0 z-10"
              aria-hidden="true"
            >
              <div className="w-12 h-1 bg-slate-600 rounded-full" />
            </div>
          )}

          {/* Actual Rendered Template Inside Device Frame */}
          <div
            data-testid="preview-content-scrollable"
            className="flex-1 w-full overflow-y-auto bg-white"
          >
            <TemplateRenderer templateId={activeTemplate} data={data} />
          </div>

          {/* Mobile Home Indicator */}
          {device === "mobile" && (
            <div
              className="w-full bg-white h-5 flex items-center justify-center shrink-0 pb-1"
              aria-hidden="true"
            >
              <div className="w-32 h-1 bg-slate-300 rounded-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PreviewShell;

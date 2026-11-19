"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/** Visible, focusable descendants of a container in DOM order. */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.closest("[inert]") && el.getClientRects().length > 0
  );
}

/**
 * Decides where Tab should move focus inside a modal (WAI-ARIA dialog pattern):
 * wrap from the last element to the first (and back with Shift+Tab), and pull
 * focus back in if it is somehow outside. Returns null to let the browser
 * handle the key normally.
 */
export function getWrappedFocusTarget<T>(
  items: readonly T[],
  active: T | null,
  shiftKey: boolean,
  isInside: boolean
): T | null {
  if (items.length === 0) return null;
  const first = items[0]!;
  const last = items[items.length - 1]!;
  if (!isInside) return shiftKey ? last : first;
  if (shiftKey && active === first) return last;
  if (!shiftKey && active === last) return first;
  return null;
}

export interface ModalFocusOptions {
  /** Element to focus on open; defaults to the first focusable element. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Element id to focus on close if the original trigger no longer exists. */
  fallbackFocusId?: string;
  /** Prevent the page behind the modal from scrolling (default true). */
  lockScroll?: boolean;
  /**
   * The container is a native <dialog>: open it with showModal() AFTER the
   * trigger has been recorded (showModal moves focus into the dialog), and
   * close it on cleanup.
   */
  nativeDialog?: boolean;
}

/**
 * Focus management for modal dialogs (DASH-06): initial focus, Tab/Shift+Tab
 * containment, background scroll lock, and focus restoration on close.
 * No dependencies; works for both <dialog> and div-based modals.
 */
export function useModalFocus(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  { initialFocusRef, fallbackFocusId, lockScroll = true, nativeDialog = false }: ModalFocusOptions = {}
): void {
  useEffect(() => {
    const container = containerRef.current;
    if (!active || !container) return;

    // Record the trigger before anything (including showModal) moves focus.
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog =
      nativeDialog && typeof HTMLDialogElement !== "undefined" && container instanceof HTMLDialogElement
        ? container
        : null;
    if (dialog && !dialog.open && typeof dialog.showModal === "function") {
      dialog.showModal();
    }
    const previousOverflow = document.body.style.overflow;
    if (lockScroll) document.body.style.overflow = "hidden";

    const initial = initialFocusRef?.current ?? getFocusableElements(container)[0] ?? container;
    initial.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = getFocusableElements(container);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const activeEl = document.activeElement as HTMLElement | null;
      const target = getWrappedFocusTarget(
        items,
        activeEl,
        event.shiftKey,
        Boolean(activeEl && container.contains(activeEl))
      );
      if (target) {
        event.preventDefault();
        target.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      if (lockScroll) document.body.style.overflow = previousOverflow;
      if (dialog?.open) dialog.close();
      if (
        previouslyFocused &&
        previouslyFocused.isConnected &&
        previouslyFocused !== document.body &&
        !container.contains(previouslyFocused)
      ) {
        previouslyFocused.focus();
      } else if (fallbackFocusId) {
        document.getElementById(fallbackFocusId)?.focus();
      }
    };
  }, [active, containerRef, initialFocusRef, fallbackFocusId, lockScroll, nativeDialog]);
}

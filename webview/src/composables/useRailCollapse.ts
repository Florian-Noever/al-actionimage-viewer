import { ref } from 'vue';
import type { Ref } from 'vue';
import { useResizeObserver } from '@vueuse/core';
import { getState, setState } from '../vscode';
import { RAIL_AUTO_COLLAPSE_WIDTH, RAIL_AUTO_EXPAND_WIDTH, ZOOM_DEFAULT } from '../constants';

/**
 * Manages the category rail collapsed/expanded state, including:
 * - Auto-collapse when the webview becomes too narrow
 * - Auto-expand when it widens again (only if auto-collapsed, not manually)
 * - Manual toggle with persistence via vscode state
 *
 * Optionally accepts zoom state so that auto-collapse also reduces zoom
 * (only when zoom is at the default 100%) and restores it on auto-expand.
 *
 * @param rootRef    - ref to the root DOM element to observe for width changes
 * @param zoomRef    - optional ref to the current zoom value (from useZoom)
 * @param applyZoom  - optional function to change zoom (from useZoom)
 */
export function useRailCollapse(rootRef: Ref<HTMLElement | null>, zoomRef?: Ref<number>, applyZoom?: (zoom: number) => void) {
    const railCollapsed = ref(false);
    const autoCollapsed = ref(false);
    let autoZoomed = false;

    useResizeObserver(rootRef, ([entry]) => {
        const width = entry.contentRect.width;
        if (width < RAIL_AUTO_COLLAPSE_WIDTH && !railCollapsed.value) {
            railCollapsed.value = true;
            autoCollapsed.value = true;
            if (zoomRef && applyZoom && zoomRef.value === ZOOM_DEFAULT) {
                applyZoom(ZOOM_DEFAULT * 0.55); // zoom out to 55% at narrow widths
                autoZoomed = true;
            }
        } else if (width >= RAIL_AUTO_EXPAND_WIDTH && autoCollapsed.value) {
            railCollapsed.value = false;
            autoCollapsed.value = false;
            if (autoZoomed && applyZoom) {
                applyZoom(ZOOM_DEFAULT);
                autoZoomed = false;
            }
        }
    });

    function toggleRailCollapse(): void {
        autoCollapsed.value = false;
        railCollapsed.value = !railCollapsed.value;
        try {
            setState({ ...(getState<Record<string, unknown>>() ?? {}), railCollapsed: railCollapsed.value });
        } catch (err) {
            console.warn('Failed to persist rail state:', err);
        }
    }

    function restoreRailState(): void {
        try {
            const state = getState<{ railCollapsed?: boolean; }>();
            if (state?.railCollapsed) {
                railCollapsed.value = true;
            }
        } catch (err) {
            console.warn('Failed to restore rail state:', err);
        }
    }

    return { railCollapsed, toggleRailCollapse, restoreRailState };
}

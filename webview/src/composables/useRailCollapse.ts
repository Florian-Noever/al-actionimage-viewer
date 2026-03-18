import { ref } from 'vue';
import type { Ref } from 'vue';
import { useResizeObserver } from '@vueuse/core';
import { getState, setState } from '../vscode';
import { RAIL_AUTO_COLLAPSE_WIDTH, RAIL_AUTO_EXPAND_WIDTH } from '../constants';

/**
 * Manages the category rail collapsed/expanded state, including:
 * - Auto-collapse when the webview becomes too narrow
 * - Auto-expand when it widens again (only if auto-collapsed, not manually)
 * - Manual toggle with persistence via vscode state
 *
 * @param rootRef - ref to the root DOM element to observe for width changes
 */
export function useRailCollapse(rootRef: Ref<HTMLElement | null>) {
    const railCollapsed = ref(false);
    const autoCollapsed = ref(false);

    useResizeObserver(rootRef, ([entry]) => {
        const width = entry.contentRect.width;
        if (width < RAIL_AUTO_COLLAPSE_WIDTH && !railCollapsed.value) {
            railCollapsed.value = true;
            autoCollapsed.value = true;
        } else if (width >= RAIL_AUTO_EXPAND_WIDTH && autoCollapsed.value) {
            railCollapsed.value = false;
            autoCollapsed.value = false;
        }
    });

    function toggleRailCollapse(): void {
        autoCollapsed.value = false;
        railCollapsed.value = !railCollapsed.value;
        try {
            setState({ ...(getState<Record<string, unknown>>() ?? {}), railCollapsed: railCollapsed.value });
        } catch { /* swallow */ }
    }

    function restoreRailState(): void {
        try {
            const state = getState<{ railCollapsed?: boolean; }>();
            if (state?.railCollapsed) {
                railCollapsed.value = true;
            }
        } catch { /* swallow */ }
    }

    return { railCollapsed, toggleRailCollapse, restoreRailState };
}

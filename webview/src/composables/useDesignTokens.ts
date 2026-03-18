import { GAP, PAD, FONT_SIZE, RAIL_WIDTH, RAIL_COLLAPSED_WIDTH } from '../constants';

/**
 * Injects layout-level design tokens as CSS custom properties on <html>.
 * Tile-related vars (--tile-w/h, --img) are managed by useZoom instead.
 */
export function useDesignTokens(): void {
    const root = document.documentElement;
    root.style.setProperty('--gap', GAP + 'px');
    root.style.setProperty('--pad', PAD + 'px');
    root.style.setProperty('--font', FONT_SIZE + 'px');
    root.style.setProperty('--rail-w', RAIL_WIDTH + 'px');
    root.style.setProperty('--rail-collapsed-w', RAIL_COLLAPSED_WIDTH + 'px');
}

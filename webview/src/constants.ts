// ---------------------------
// Shared constants
// ---------------------------

// --- Layout ---
export const GAP = 16;
export const PAD = 12;
export const FONT_SIZE = 12;

// --- Category rail ---
export const RAIL_WIDTH = 240;
export const RAIL_COLLAPSED_WIDTH = 52;
export const RAIL_AUTO_COLLAPSE_WIDTH = 490;
export const RAIL_AUTO_EXPAND_WIDTH = 530;

// --- Tile base sizes (before zoom; injected by useZoom) ---
export const BASE_TILE_W = 110;
export const BASE_TILE_H = 120;
export const BASE_IMG = 48;

// --- Zoom ---
export const ZOOM_MIN = 0.4;
export const ZOOM_MAX = 2.0;
export const ZOOM_STEP = 0.05;
export const ZOOM_DEFAULT = 1.0;

// --- Grid ---
export const GRID_PAD = 12;
export const GRID_OVERSCAN = 4;

/**
 * Original pixel size of AL action images as shipped in the AL Language extension.
 * Used to determine whether upscaled (pixelated) rendering should be applied.
 */
export const IMAGE_ORIGINAL_SIZE = 32;

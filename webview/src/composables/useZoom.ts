import { ref, computed, onMounted, onUnmounted } from 'vue';
import { getState, setState } from '../vscode';

const BASE_TILE_W = 110;
const BASE_TILE_H = 120;
const BASE_IMG = 48;

export const ZOOM_MIN = 0.40;
export const ZOOM_MAX = 2.0;
export const ZOOM_STEP = 0.05;

const zoom = ref(1.0);

function applyZoom(newZoom: number): void {
    newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +newZoom));
    if (!isFinite(newZoom) || newZoom === zoom.value) { return; }
    zoom.value = newZoom;
    document.documentElement.style.setProperty('--tile-w', Math.round(BASE_TILE_W * newZoom) + 'px');
    document.documentElement.style.setProperty('--tile-h', Math.round(BASE_TILE_H * newZoom) + 'px');
    document.documentElement.style.setProperty('--img', Math.round(BASE_IMG * newZoom) + 'px');
    try { setState({ zoom: newZoom }); } catch { /* swallow */ }
}

function zoomIn(): void { applyZoom(zoom.value + ZOOM_STEP); }
function zoomOut(): void { applyZoom(zoom.value - ZOOM_STEP); }
function resetZoom(): void { applyZoom(1.0); }

const tileW = computed(() => Math.round(BASE_TILE_W * zoom.value));
const tileH = computed(() => Math.round(BASE_TILE_H * zoom.value));
const imgSize = computed(() => Math.round(BASE_IMG * zoom.value));

function setupKeyboardHandlers(): () => void {
    function onKeydown(e: KeyboardEvent): void {
        if (e.ctrlKey || e.metaKey || e.altKey) { return; }
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') { return; }
        if (e.key === '=' || e.key === '+') { e.preventDefault(); zoomIn(); }
        if (e.key === '-') { e.preventDefault(); zoomOut(); }
        if (e.key === '0') { e.preventDefault(); resetZoom(); }
    }
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
}

export function useZoom() {
    onMounted(() => {
        // Restore persisted zoom
        try {
            const state = getState<{ zoom?: number }>();
            applyZoom(state?.zoom ?? 1.0);
        } catch {
            applyZoom(1.0);
        }
        const cleanup = setupKeyboardHandlers();
        onUnmounted(cleanup);
    });

    return { zoom, tileW, tileH, imgSize, applyZoom, zoomIn, zoomOut, resetZoom };
}

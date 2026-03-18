import { ref, computed, onMounted, onUnmounted } from 'vue';
import { getState, setState } from '../vscode';
import { BASE_TILE_W, BASE_TILE_H, BASE_IMG, ZOOM_MIN, ZOOM_MAX, ZOOM_STEP, ZOOM_DEFAULT } from '../constants';

export { ZOOM_MIN, ZOOM_MAX, ZOOM_STEP };

const zoom = ref(ZOOM_DEFAULT);

function applyZoom(newZoom: number): void {
    newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +newZoom));
    if (!isFinite(newZoom) || newZoom === zoom.value) {
        return;
    }
    zoom.value = newZoom;
    document.documentElement.style.setProperty('--tile-w', Math.round(BASE_TILE_W * newZoom) + 'px');
    document.documentElement.style.setProperty('--tile-h', Math.round(BASE_TILE_H * newZoom) + 'px');
    document.documentElement.style.setProperty('--img', Math.round(BASE_IMG * newZoom) + 'px');
    try {
        setState({ ...(getState<Record<string, unknown>>() ?? {}), zoom: newZoom });
    } catch { /* swallow */ }
}

function zoomIn(): void { applyZoom(zoom.value + ZOOM_STEP); }
function zoomOut(): void { applyZoom(zoom.value - ZOOM_STEP); }
function resetZoom(): void { applyZoom(ZOOM_DEFAULT); }

const tileW = computed(() => Math.round(BASE_TILE_W * zoom.value));
const tileH = computed(() => Math.round(BASE_TILE_H * zoom.value));
const imgSize = computed(() => Math.round(BASE_IMG * zoom.value));

function setupKeyboardHandlers(): () => void {
    function onKeydown(e: KeyboardEvent): void {
        if (e.ctrlKey || e.metaKey || e.altKey) {
            return;
        }
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') {
            return;
        }

        switch (e.key) {
            case '=':
            case '+':
                e.preventDefault();
                zoomIn();
                break;
            case '-':
                e.preventDefault();
                zoomOut();
                break;
            case '0':
                e.preventDefault();
                resetZoom();
                break;
        }
    }
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
}

export function useZoom() {
    onMounted(() => {
        // Restore persisted zoom
        try {
            const state = getState<{ zoom?: number; }>();
            applyZoom(state?.zoom ?? ZOOM_DEFAULT);
        } catch {
            applyZoom(ZOOM_DEFAULT);
        }
        const cleanup = setupKeyboardHandlers();
        onUnmounted(cleanup);
    });

    return { zoom, tileW, tileH, imgSize, applyZoom, zoomIn, zoomOut, resetZoom };
}

<template>
    <div ref="rootRef" class="root" :class="{ 'rail-collapsed': railCollapsed, 'sidebar-mode': sidebarMode }">
        <CategoryRail
            v-if="!sidebarMode"
            :categories="categories"
            :active="activeCategory"
            :collapsed="railCollapsed"
            @change="setCategory"
            @toggle="toggleRailCollapse"
            @contextmenu="openCatCtxMenu"
        />

        <main class="content">
            <SearchHeader
                :title="activeCategory"
                :count="currentItems.length"
                :zoom="zoom"
                :zoom-min="ZOOM_MIN"
                :zoom-max="ZOOM_MAX"
                :zoom-step="ZOOM_STEP"
                :search-query="searchQuery"
                :sort-ascending="sortAscending"
                :sidebar-mode="sidebarMode"
                @zoom-in="zoomIn"
                @zoom-out="zoomOut"
                @zoom-set="applyZoom"
                @reload="requestReload"
                @sort="toggleSort"
                @search="searchQuery = $event"
            />

            <div class="grid-wrapper">
                <StatusPane
                    :loading="loading"
                    :loading-message="loadingMessage"
                    :error="hasError"
                    :error-message="errorMessage"
                    @retry="requestReload"
                />

                <ImageGrid
                    :items="currentItems"
                    :tile-w="tileW"
                    :tile-h="tileH"
                    :img-size="imgSize"
                    :gap="GAP"
                    :selected-name="selectedName"
                    @contextmenu="openCtxMenu"
                    @zoom-step="step => applyZoom(zoom + step * ZOOM_STEP)"
                    @select="onSelectItem"
                />
            </div>
        </main>

        <ContextMenu
            :visible="ctx.visible"
            :x="ctx.x"
            :y="ctx.y"
            :item="ctx.item"
            @action="onCtxAction"
            @close="ctx.visible = false"
        />

        <CategoryContextMenu
            :visible="catCtx.visible"
            :x="catCtx.x"
            :y="catCtx.y"
            :category="catCtx.category"
            @action="onCatCtxAction"
            @close="catCtx.visible = false"
        />

        <div v-if="debugActive" class="debug-badge" title="Debug borders ON - click or Ctrl+Shift+D to toggle" @click="toggleDebug">
            <img :src="hexagonSrc" class="debug-hex" alt="" />
            DEBUG
        </div>

        <!-- Visually hidden live region for screen reader announcements -->
        <div role="status" aria-live="polite" aria-atomic="true" class="sr-only">{{ announcement }}</div>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted, onUnmounted } from 'vue';
import CategoryRail from './components/CategoryRail.vue';
import SearchHeader from './components/SearchHeader.vue';
import ImageGrid from './components/ImageGrid.vue';
import StatusPane from './components/StatusPane.vue';
import ContextMenu from './components/ContextMenu.vue';
import CategoryContextMenu from './components/CategoryContextMenu.vue';
import { useZoom, ZOOM_MIN, ZOOM_MAX, ZOOM_STEP } from './composables/useZoom';
import { useSearch } from './composables/useSearch';
import { useDebug } from './composables/useDebug';
import { useDesignTokens } from './composables/useDesignTokens';
import { useRailCollapse } from './composables/useRailCollapse';
import { useImageData } from './composables/useImageData';
import { postMessage, isSidebarMode } from './vscode';
import { parseDataUrl, blobFromDataUrl, notify } from './utils';
import { isExtensionMessage } from './types/extensionMessages';
import type { ImageInformationDTO } from './types/imageInformationDTO';
import type { ImageMap } from './types/imageInformationDTO';
import hexagonSrc from './assets/hexagon.svg';
import { GAP } from './constants';

// Inject layout design tokens as CSS custom properties on <html>
useDesignTokens();

// ---- Zoom ----
const { zoom, tileW, tileH, imgSize, applyZoom, zoomIn, zoomOut } = useZoom();

// ---- Sidebar mode ----
const sidebarMode = isSidebarMode();

// ---- Rail collapse ----
const rootRef = ref<HTMLElement | null>(null);
const { railCollapsed, toggleRailCollapse, restoreRailState } = useRailCollapse(
    rootRef,
    sidebarMode ? undefined : zoom,
    sidebarMode ? undefined : applyZoom,
);

// ---- Debug ----
const { debugActive, toggle: toggleDebug } = useDebug();

// ---- Selection ----
const selectedName = ref<string | null>(null);
const announcement = ref('');

function onSelectItem(item: ImageInformationDTO): void {
    const name = item.name ?? null;
    selectedName.value = selectedName.value === name ? null : name;
}

watch(selectedName, (name) => {
    if (name) {
        const item = currentItems.value.find(i => i.name === name);
        announcement.value = item
            ? `Selected: ${name}, category ${item.category}`
            : `Selected: ${name}`;
    } else {
        announcement.value = '';
    }
});

// ---- Data / loading / error state ----
const {
    data,
    categories,
    activeCategory,
    loading,
    loadingMessage,
    hasError,
    errorMessage,
    showLoading,
    showError,
    setCategory,
    onDataMessage,
} = useImageData();

// ---- Search ----
const { searchQuery, currentItems, sortAscending, toggleSort } = useSearch(data, categories, activeCategory);

let devTimer: ReturnType<typeof setTimeout> | undefined;

// ---- Context menu ----
const ctx = reactive<{
    visible: boolean;
    x: number;
    y: number;
    item: ImageInformationDTO | null;
}>({ visible: false, x: 0, y: 0, item: null });

function openCtxMenu(payload: { item: ImageInformationDTO; clientX: number; clientY: number }): void {
    ctx.item = payload.item;
    ctx.x = payload.clientX;
    ctx.y = payload.clientY;
    ctx.visible = true;
}

// ---- Category context menu ----
const catCtx = reactive<{
    visible: boolean;
    x: number;
    y: number;
    category: string | null;
}>({ visible: false, x: 0, y: 0, category: null });

function openCatCtxMenu(payload: { category: string; clientX: number; clientY: number }): void {
    catCtx.category = payload.category;
    catCtx.x = payload.clientX;
    catCtx.y = payload.clientY;
    catCtx.visible = true;
}

async function onCatCtxAction(action: string, category: string): Promise<void> {
    try {
        if (action === 'copy-name') {
            await navigator.clipboard.writeText(category);
            notify('info', `Copied: ${category}`);
        }
        if (action === 'export-images') {
            const items = category === 'All Images'
                ? Object.values(data.value).flat()
                : (data.value[category] ?? []);
            const images = items
                .filter(item => !!item.imageDataUrl)
                .map(item => {
                    const parsed = parseDataUrl(item.imageDataUrl ?? '');
                    if (!parsed) {
                        return null;
                    }
                    const safeName = (item.name ?? 'image').replace(/[\\/:*?"<>|]/g, '_');
                    return { name: safeName, mime: parsed.mime, base64: parsed.base64 };
                })
                .filter(Boolean);
            if (images.length === 0) {
                notify('warning', 'No images to export in this category.');
                return;
            }
            postMessage({ type: 'export-category', payload: { category, images } });
        }
    } catch (err: unknown) {
        notify('error', err instanceof Error ? err.message : String(err));
    }
}

async function onCtxAction(action: string, item: ImageInformationDTO): Promise<void> {
    const src = item.imageDataUrl ?? '';
    const name = item.name ?? '(unnamed)';
    try {
        if (action === 'copy-name') {
            await navigator.clipboard.writeText(name);
            notify('info', `Copied name: ${name}`);
        }
        if (action === 'copy-image') {
            const blob = blobFromDataUrl(src);
            try {
                await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
                notify('info', 'Image copied to clipboard.');
            } catch {
                await navigator.clipboard.writeText(src);
                notify('warning', 'Could not copy as image; copied data URL instead.');
            }
        }
        if (action === 'export-image') {
            const parsed = parseDataUrl(src);
            if (!parsed) {
                throw new Error('Invalid image data.');
            }
            const safeName = name.replace(/[\\/:*?"<>|]/g, '_');
            postMessage({ type: 'export-image', payload: { name: safeName, mime: parsed.mime, base64: parsed.base64 } });
        }
    } catch (err: unknown) {
        notify('error', err instanceof Error ? err.message : String(err));
    }
}

// ---- Reload ----
function requestReload(): void {
    showLoading('Reloading...');
    postMessage({ type: 'retry' });
}

// ---- Message handler ----
function onMessage(evt: MessageEvent): void {
    if (!isExtensionMessage(evt.data)) {
        return;
    }
    onDataMessage(evt.data);
}

// ---- F5 reload + 1-9 category shortcut ----
function onKeydown(e: KeyboardEvent): void {
    if (e.key === 'F5') {
        e.preventDefault();
        requestReload();
    }

    // 1-9: select category by position (no modifier, not typing in an input)
    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
            const digit = parseInt(e.key, 10);
            if (digit >= 1 && digit <= 9) {
                const allCategories = ['All Images', ...categories.value];
                const cat = allCategories[digit - 1];
                if (cat !== undefined) {
                    e.preventDefault();
                    setCategory(cat);
                }
            }
        }
    }
}

onMounted(() => {
    window.addEventListener('message', onMessage);
    window.addEventListener('keydown', onKeydown);

    // Restore persisted rail state
    restoreRailState();

    // Signal extension we're ready
    showLoading('Loading images...');
    postMessage({ type: 'ready' });

    // Dev fallback: demo data when running in plain browser
    if (typeof acquireVsCodeApi === 'undefined') {
        const demo: ImageMap = {
            ActionImages: Array.from({ length: 100 }, (_, i) => ({
                name: `Action ${i + 1}`, category: 'ActionImages', tags: [], imageDataUrl: '',
            })),
            OtherImages: Array.from({ length: 120 }, (_, i) => ({
                name: `Other ${i + 1}`, category: 'OtherImages', tags: [], imageDataUrl: '',
            })),
        };
        devTimer = setTimeout(() => window.dispatchEvent(new MessageEvent('message', { data: { type: 'setData', payload: demo } })), 300);
    }
});

onUnmounted(() => {
    clearTimeout(devTimer);
    window.removeEventListener('message', onMessage);
    window.removeEventListener('keydown', onKeydown);
});

declare function acquireVsCodeApi(): unknown;
</script>

<style scoped>
.root {
    display: grid;
    grid-template-columns: var(--rail-w) 1fr;
    height: 100vh;
    transition: grid-template-columns var(--duration-base) ease;
}

.root.rail-collapsed {
    grid-template-columns: var(--rail-collapsed-w) 1fr;
}

.root.sidebar-mode {
    grid-template-columns: 1fr;
}

.content {
    position: relative;
    overflow: hidden;
    display: grid;
    grid-template-rows: auto 1fr;
    container-type: inline-size;
    container-name: content-area;
}

.grid-wrapper {
    position: relative;
    overflow: hidden;
}

.debug-badge {
    position: fixed;
    bottom: 10px;
    right: 12px;
    z-index: var(--z-debug);
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border-radius: var(--radius-sm);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.05em;
    background: rgba(255, 0, 128, 0.15);
    border: 1px solid rgba(255, 0, 128, 0.6);
    color: rgb(255, 80, 160);
    pointer-events: all;
    cursor: pointer;
    user-select: none;
}

.debug-hex {
    width: 14px;
    height: 14px;
    filter: invert(44%) sepia(90%) saturate(600%) hue-rotate(290deg) brightness(110%);
}
</style>

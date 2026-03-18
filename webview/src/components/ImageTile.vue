<template>
    <button
        type="button"
        class="tile"
        :class="{ selected }"
        :title="item.name ?? '(unnamed)'"
        :aria-label="`${item.name ?? '(unnamed)'}, category ${item.category}`"
        :aria-pressed="selected"
        :tabindex="isFocused ? 0 : -1"
        :data-focused="isFocused ? true : undefined"
        :draggable="!!item.imageDataUrl"
        @click="onTileClick"
        @focus="onFocused"
        @dragstart="onDragStart"
        @contextmenu.prevent="onContextMenu"
    >
        <img
            :src="item.imageDataUrl || placeholderSrc"
            :class="{ placeholder: !item.imageDataUrl, upscaled }"
            draggable="false"
            alt=""
            loading="lazy"
        />
        <div class="label">{{ item.name ?? '(unnamed)' }}</div>
    </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import placeholderSrc from '../assets/image.svg';
import type { ImageInformationDTO } from '../types/imageInformationDTO';

const ORIGINAL_IMG_SIZE = 32; // Assuming all images are 32px

const props = defineProps<{ 
    item: ImageInformationDTO;
    imgSize: number;
    selected: boolean;
    isFocused: boolean;
}>();

const emit = defineEmits<{
    contextmenu: [payload: { item: ImageInformationDTO; clientX: number; clientY: number }];
    select: [item: ImageInformationDTO];
    focused: [item: ImageInformationDTO];
}>();

function onTileClick(): void {
    emit('select', props.item);
}

function onFocused(): void {
    emit('focused', props.item);
}

// Determine if image is upscaled relative to original 32px size
const upscaled = computed(() => props.imgSize >= ORIGINAL_IMG_SIZE);

function onDragStart(e: DragEvent): void {
    if (!e.dataTransfer || !props.item.imageDataUrl) {
        return;
    }
    const src = props.item.imageDataUrl;
    const mimeMatch = src.match(/^data:([^;]+);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const extMap: Record<string, string> = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/gif': 'gif',
        'image/bmp': 'bmp',
        'image/webp': 'webp'
    };
    const ext = extMap[mime] ?? 'png';
    const safeName = (props.item.name ?? 'image').replace(/[\\/:*?"<>|]/g, '_');
    e.dataTransfer.setData('DownloadURL', `${mime}:${safeName}.${ext}:${src}`);
}

function onContextMenu(e: MouseEvent): void {
    // Keyboard-triggered contextmenu (Menu key / Shift+F10) has clientX/Y = 0.
    // In that case, position the menu at the bottom-left of the tile instead.
    let { clientX, clientY } = e;
    if (clientX === 0 && clientY === 0) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        clientX = rect.left;
        clientY = rect.bottom;
    }
    emit('contextmenu', { item: props.item, clientX, clientY });
}
</script>

<style scoped>
.tile {
    /* button element resets */
    background: none;
    border: none;
    font: inherit;
    color: inherit;
    text-align: center;
    /* layout */
    width: var(--tile-w);
    height: calc(var(--tile-h) - 4px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: var(--radius-card);
    padding: 8px 4px;
    box-sizing: border-box;
    user-select: none;
    cursor: pointer;
}

.tile:hover {
    background: var(--vscode-editor-hoverHighlightBackground, rgba(127, 127, 127, 0.08));
}

.tile.selected {
    background: var(--vscode-list-activeSelectionBackground, rgba(0, 120, 212, 0.25));
    outline: 1.5px solid var(--vscode-focusBorder, #007fd4);
    outline-offset: -1.5px;
}

.tile.selected:hover {
    background: var(--vscode-list-activeSelectionBackground, rgba(0, 120, 212, 0.35));
}

/* Keyboard focus ring - overrides the selection outline so the focus state is always clear */
.tile:focus-visible,
.tile.selected:focus-visible {
    outline: 2px solid var(--vscode-focusBorder, #007fd4);
    outline-offset: 2px;
}

.tile img {
    width: var(--img);
    height: var(--img);
    object-fit: contain;
    image-rendering: auto;
}

.tile img.upscaled {
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    -ms-interpolation-mode: nearest-neighbor;
}

.tile img.placeholder {
    opacity: 0.25;
    image-rendering: auto;
}

.label {
    font-size: var(--font);
    line-height: 1.2;
    text-align: center;
    max-width: calc(var(--tile-w) - 10px);
    overflow: hidden;
    display: -webkit-box;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
}
</style>

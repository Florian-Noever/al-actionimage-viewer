<template>
    <div
        class="tile"
        :class="{ selected }"
        :title="item.name ?? '(unnamed)'"
        @click="onTileClick"
        @contextmenu.prevent="onContextMenu"
    >
        <img
            :src="item.imageDataUrl || placeholderSrc"
            :class="{ placeholder: !item.imageDataUrl, upscaled }"
            alt=""
            loading="lazy"
        />
        <div class="label">{{ item.name ?? '(unnamed)' }}</div>
    </div>
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
}>();

const emit = defineEmits<{
    contextmenu: [payload: { item: ImageInformationDTO; clientX: number; clientY: number }];
    select: [item: ImageInformationDTO];
}>();

function onTileClick(): void {
    emit('select', props.item);
}

// Determine if image is upscaled relative to original 32px size
const upscaled = computed(() => props.imgSize >= ORIGINAL_IMG_SIZE);

function onContextMenu(e: MouseEvent): void {
    emit('contextmenu', { item: props.item, clientX: e.clientX, clientY: e.clientY });
}
</script>

<style scoped>
.tile {
    width: var(--tile-w);
    height: calc(var(--tile-h) - 4px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 10px;
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

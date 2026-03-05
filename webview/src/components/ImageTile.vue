<template>
    <div
        class="tile"
        :title="item.name ?? '(unnamed)'"
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
}>();

const emit = defineEmits<{
    contextmenu: [payload: { item: ImageInformationDTO; clientX: number; clientY: number }];
}>();

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
    cursor: default;
}

.tile:hover {
    background: var(--vscode-editor-hoverHighlightBackground, rgba(127, 127, 127, 0.08));
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

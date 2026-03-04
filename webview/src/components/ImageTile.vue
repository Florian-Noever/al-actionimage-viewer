<template>
    <div
        class="tile"
        :title="item.name ?? '(unnamed)'"
        @contextmenu.prevent="onContextMenu"
    >
        <img
            :src="item.imageDataUrl ?? ''"
            alt=""
            loading="lazy"
            @load="onImgLoad"
        />
        <div class="label">{{ item.name ?? '(unnamed)' }}</div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { ImageInformationDTO } from '../types/imageInformationDTO';

const props = defineProps<{ item: ImageInformationDTO }>();
const emit = defineEmits<{
    contextmenu: [payload: { item: ImageInformationDTO; clientX: number; clientY: number }];
}>();

const imgRef = ref<HTMLImageElement | null>(null);

function onContextMenu(e: MouseEvent): void {
    emit('contextmenu', { item: props.item, clientX: e.clientX, clientY: e.clientY });
}

function onImgLoad(e: Event): void {
    const img = e.target as HTMLImageElement;
    const nw = img.naturalWidth, nh = img.naturalHeight;
    if (!nw || !nh) { return; }
    const rw = img.clientWidth, rh = img.clientHeight;
    const upscaled = rw > nw * 1.01 || rh > nh * 1.01;
    img.classList.toggle('upscaled', upscaled);
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

<template>
    <div
        ref="scrollerRef"
        class="scroller"
        @wheel.ctrl.prevent="onCtrlWheel"
        @contextmenu.prevent
    >
        <div v-if="items.length === 0" class="empty">No images.</div>
        <template v-else>
            <div :style="{ height: rowVirtualizer.getTotalSize() + 'px', position: 'relative' }">
                <div
                    v-for="vRow in rowVirtualizer.getVirtualItems()"
                    :key="vRow.index"
                    class="vrow"
                    :style="{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        transform: `translateY(${vRow.start}px)`,
                        height: vRow.size + 'px',
                        display: 'grid',
                        gridAutoFlow: 'column',
                        gridAutoColumns: tileW + 'px',
                        columnGap: gap + 'px',
                        paddingLeft: pad + 'px',
                        paddingRight: pad + 'px',
                        boxSizing: 'border-box',
                        paddingTop: '2px',
                        paddingBottom: '2px',
                    }"
                >
                    <ImageTile
                        v-for="item in rowItems(vRow.index)"
                        :key="item.name ?? vRow.index"
                        :item="item"
                        :img-size="imgSize"
                        :selected="item.name !== null && item.name === selectedName"
                        @contextmenu="$emit('contextmenu', $event)"
                        @select="$emit('select', $event)"
                    />
                </div>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useVirtualizer } from '@tanstack/vue-virtual';
import ImageTile from './ImageTile.vue';
import type { ImageInformationDTO } from '../types/imageInformationDTO';

const props = defineProps<{
    items: ImageInformationDTO[];
    tileW: number;
    tileH: number;
    imgSize: number;
    gap: number;
    selectedName?: string | null;
}>();

const emit = defineEmits<{
    contextmenu: [payload: { item: ImageInformationDTO; clientX: number; clientY: number }];
    zoomStep: [direction: number];
    select: [item: ImageInformationDTO];
}>();

const PAD = 24;
const OVERSCAN = 4;
const pad = 12;

const scrollerRef = ref<HTMLElement | null>(null);
const containerWidth = ref(800);

const columns = computed(() => {
    const colSpace = props.tileW + props.gap;
    return Math.max(1, Math.floor((containerWidth.value - PAD) / colSpace));
});

const totalRows = computed(() => Math.ceil(props.items.length / columns.value));

const rowVirtualizer = useVirtualizer(
    computed(() => ({
        count: totalRows.value,
        getScrollElement: () => scrollerRef.value,
        estimateSize: () => props.tileH,
        overscan: OVERSCAN,
    }))
);

function rowItems(rowIndex: number): ImageInformationDTO[] {
    const start = rowIndex * columns.value;
    return props.items.slice(start, start + columns.value);
}

// Anchor-lock: keep top item stable during zoom bursts
let anchorIndex: number | null = null;
let anchorTimer: ReturnType<typeof setTimeout> | null = null;

function getCurrentTopIndex(): number {
    if (!scrollerRef.value || props.items.length === 0) { return 0; }
    const row = Math.max(0, Math.floor(scrollerRef.value.scrollTop / props.tileH));
    return Math.min(row * columns.value, props.items.length - 1);
}

watch([() => props.tileW, () => props.tileH], () => {
    // If there is a selected item visible in the current list, keep it on screen
    const selectedIdx = props.selectedName
        ? props.items.findIndex(item => item.name === props.selectedName)
        : -1;

    if (selectedIdx >= 0) {
        const captured = selectedIdx;
        nextTick(() => {
            const row = Math.floor(captured / columns.value);
            rowVirtualizer.value.scrollToIndex(row, { align: 'center' });
        });
        return;
    }

    if (anchorIndex === null) { anchorIndex = getCurrentTopIndex(); }
    if (anchorTimer) { clearTimeout(anchorTimer); }
    anchorTimer = setTimeout(() => { anchorIndex = null; anchorTimer = null; }, 1000);

    const captured = anchorIndex;
    nextTick(() => {
        if (captured === null) { return; }
        const row = Math.floor(captured / columns.value);
        rowVirtualizer.value.scrollToIndex(row, { align: 'start' });
    });
});

// When items change (search/category), reset scroll
watch(() => props.items, () => {
    anchorIndex = null;
    scrollerRef.value?.scrollTo({ top: 0 });
}, { flush: 'post' });

function onCtrlWheel(e: WheelEvent): void {
    emit('zoomStep', Math.sign(e.deltaY) > 0 ? -1 : 1);
}

// ResizeObserver to track container width
let ro: ResizeObserver | null = null;
onMounted(() => {
    if (scrollerRef.value) {
        containerWidth.value = scrollerRef.value.clientWidth;
        ro = new ResizeObserver(([entry]) => {
            containerWidth.value = entry.contentRect.width;
        });
        ro.observe(scrollerRef.value);
    }
});
onUnmounted(() => ro?.disconnect());
</script>

<style scoped>
.scroller {
    position: relative;
    overflow-x: hidden;
    overflow-y: auto;
    height: 100%;
}

.empty {
    padding: 24px;
    opacity: 0.6;
}
</style>

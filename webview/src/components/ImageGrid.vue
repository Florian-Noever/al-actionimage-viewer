<template>
    <div
        ref="scrollerRef"
        class="scroller"
        role="grid"
        aria-label="Images"
        :aria-rowcount="totalRows"
        :aria-colcount="columns"
        @wheel.prevent="onWheel"
        @contextmenu.prevent
        @keydown="onGridKeydown"
    >
        <div v-if="items.length === 0" class="empty">No images.</div>
        <template v-else>
            <div :style="{ height: rowVirtualizer.getTotalSize() + 'px', position: 'relative' }">
                <div
                    v-for="vRow in rowVirtualizer.getVirtualItems()"
                    :key="vRow.index"
                    class="vrow"
                    role="row"
                    :aria-rowindex="vRow.index + 1"
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
                        paddingLeft: GRID_PAD + 'px',
                        paddingRight: GRID_PAD + 'px',
                        boxSizing: 'border-box',
                        paddingTop: '2px',
                        paddingBottom: '2px',
                    }"
                >
                    <div
                        v-for="(item, colIdx) in rowItems(vRow.index)"
                        :key="item.name ?? `${vRow.index}-${colIdx}`"
                        role="gridcell"
                    >
                        <ImageTile
                            :item="item"
                            :img-size="imgSize"
                            :selected="item.name !== null && item.name === selectedName"
                            :is-focused="isTileFocused(vRow.index, colIdx)"
                            @contextmenu="$emit('contextmenu', $event)"
                            @select="onTileSelect"
                            @focused="onTileFocused"
                        />
                    </div>
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
import { GRID_PAD, GRID_OVERSCAN } from '../constants';

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

const scrollerRef = ref<HTMLElement | null>(null);
const containerWidth = ref(800);
const focusedIndex = ref<number | null>(null);

const columns = computed(() => {
    const colSpace = props.tileW + props.gap;
    return Math.max(1, Math.floor((containerWidth.value - GRID_PAD * 2 + props.gap) / colSpace));
});

const totalRows = computed(() => Math.ceil(props.items.length / columns.value));

const rowVirtualizer = useVirtualizer(
    computed(() => ({
        count: totalRows.value,
        getScrollElement: () => scrollerRef.value,
        estimateSize: () => props.tileH,
        overscan: GRID_OVERSCAN,
    }))
);

function rowItems(rowIndex: number): ImageInformationDTO[] {
    const start = rowIndex * columns.value;
    return props.items.slice(start, start + columns.value);
}

function isTileFocused(rowIdx: number, colIdx: number): boolean {
    return focusedIndex.value !== null && focusedIndex.value === rowIdx * columns.value + colIdx;
}

function onTileSelect(item: ImageInformationDTO): void {
    const idx = props.items.indexOf(item);
    if (idx >= 0) {
        focusedIndex.value = idx;
    }
    emit('select', item);
}

function onTileFocused(item: ImageInformationDTO): void {
    const idx = props.items.indexOf(item);
    if (idx >= 0) {
        focusedIndex.value = idx;
    }
}

function onGridKeydown(e: KeyboardEvent): void {
    const { key } = e;
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key)) {
        return;
    }
    e.preventDefault();
    const current = focusedIndex.value ?? 0;
    let next = current;
    switch (key) {
        case 'ArrowRight':
            next = Math.min(current + 1, props.items.length - 1);
            break;
        case 'ArrowLeft':
            next = Math.max(current - 1, 0);
            break;
        case 'ArrowDown':
            next = Math.min(current + columns.value, props.items.length - 1);
            break;
        case 'ArrowUp':
            next = Math.max(current - columns.value, 0);
            break;
        case 'Home':
            next = 0;
            break;
        case 'End':
            next = props.items.length - 1;
            break;
    }
    focusedIndex.value = next;
}

watch(focusedIndex, async (newIdx) => {
    if (newIdx === null) {
        return;
    }
    const row = Math.floor(newIdx / columns.value);
    rowVirtualizer.value.scrollToIndex(row, { align: 'auto' });
    await nextTick();
    const el = scrollerRef.value?.querySelector('[data-focused]') as HTMLElement | null;
    el?.focus();
});

// Anchor-lock: keep top item stable during zoom bursts
let anchorIndex: number | null = null;
let anchorTimer: ReturnType<typeof setTimeout> | null = null;

function getCurrentTopIndex(): number {
    if (!scrollerRef.value || props.items.length === 0) {
        return 0;
    }
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

    if (anchorIndex === null) {
        anchorIndex = getCurrentTopIndex();
    }
    if (anchorTimer) {
        clearTimeout(anchorTimer);
    }
    anchorTimer = setTimeout(() => {
        anchorIndex = null;
        anchorTimer = null;
    }, 1000);

    const captured = anchorIndex;
    nextTick(() => {
        if (captured === null) {
            return;
        }
        const row = Math.floor(captured / columns.value);
        rowVirtualizer.value.scrollToIndex(row, { align: 'start' });
    });
});

// When items change (search/category), reset scroll and focused index
watch(() => props.items, () => {
    anchorIndex = null;
    focusedIndex.value = null;
    scrollerRef.value?.scrollTo({ top: 0 });
}, { flush: 'post' });

// Smooth scrolling
let _scrollTarget = 0;
let _scrollRAF: number | null = null;

function onWheel(e: WheelEvent): void {
    if (e.ctrlKey) {
        emit('zoomStep', Math.sign(e.deltaY) > 0 ? -1 : 1);
        return;
    }

    const scroller = scrollerRef.value;
    if (!scroller) {
        return;
    }

    if (_scrollRAF === null) {
        _scrollTarget = scroller.scrollTop;
    }

    let delta = e.deltaY;
    if (e.deltaMode === 1) { // DOM_DELTA_LINE
        delta *= 40;
    } else if (e.deltaMode === 2) { // DOM_DELTA_PAGE
        delta *= scroller.clientHeight;
    }

    _scrollTarget = Math.max(
        0,
        Math.min(_scrollTarget + delta, scroller.scrollHeight - scroller.clientHeight)
    );

    if (_scrollRAF !== null) {
        cancelAnimationFrame(_scrollRAF);
    }
    _scrollRAF = requestAnimationFrame(smoothScrollStep);
}

function smoothScrollStep(): void {
    const scroller = scrollerRef.value;
    if (!scroller) {
        _scrollRAF = null;
        return;
    }

    const current = scroller.scrollTop;
    const diff = _scrollTarget - current;

    if (Math.abs(diff) < 0.5) {
        scroller.scrollTop = _scrollTarget;
        _scrollRAF = null;
        return;
    }

    scroller.scrollTop = current + diff * 0.25;
    _scrollRAF = requestAnimationFrame(smoothScrollStep);
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
onUnmounted(() => {
    if (anchorTimer) {
        clearTimeout(anchorTimer);
    }
    if (_scrollRAF !== null) {
        cancelAnimationFrame(_scrollRAF);
    }
    ro?.disconnect();
});
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

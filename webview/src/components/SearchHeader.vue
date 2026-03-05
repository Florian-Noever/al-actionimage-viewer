<template>
    <div class="header">
        <div class="title-group">
            <div class="title">{{ title }}</div>
            <div class="count">{{ count }}&nbsp;items</div>
        </div>

        <div class="search">
            <span class="icon" v-html="inlineSvg(searchIcon)" aria-hidden="true"></span>
            <input
                ref="searchInputRef"
                type="text"
                :value="searchQuery"
                placeholder='Search (supports * & "exact")'
                aria-label="Search images"
                spellcheck="false"
                @input="onSearchInput"
            />
            <button title="Clear search" aria-label="Clear search" @click="onClear">
                <span class="icon" v-html="inlineSvg(closeIcon)" aria-hidden="true"></span>
            </button>
        </div>

        <div class="zoom">
            <button title="Zoom Out (-)" aria-label="Zoom Out" @click="$emit('zoomOut')">
                <span class="icon" v-html="inlineSvg(zoomOutIcon)" aria-hidden="true"></span>
            </button>
            <input
                type="range"
                :min="zoomMin * 100"
                :max="zoomMax * 100"
                :step="zoomStep * 100"
                :value="Math.round(zoom * 100)"
                aria-label="Zoom Level"
                @input="onSlider"
            />
            <button title="Zoom In (+)" aria-label="Zoom In" @click="$emit('zoomIn')">
                <span class="icon" v-html="inlineSvg(zoomInIcon)" aria-hidden="true"></span>
            </button>
            <span class="zoomPct">{{ Math.round(zoom * 100) }}%</span>
        </div>

        <button
            class="sort"
            :title="sortAscending ? 'Sort: A→Z (click for Z→A)' : 'Sort: Z→A (click for A→Z)'"
            :aria-label="sortAscending ? 'Sort ascending' : 'Sort descending'"
            @click="$emit('sort')"
        >
            <span class="icon" v-html="inlineSvg(sortAscending ? sortAscIcon : sortDescIcon)" aria-hidden="true"></span>
        </button>

        <button class="reload" title="Reload (F5)" aria-label="Reload" @click="$emit('reload')">
            <span class="icon" v-html="inlineSvg(reloadIcon)" aria-hidden="true"></span>
        </button>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import closeIcon from '../assets/close.svg?raw';
import searchIcon from '../assets/search.svg?raw';
import reloadIcon from '../assets/refresh.svg?raw';
import sortAscIcon from '../assets/sort_by_alpha_asc.svg?raw';
import sortDescIcon from '../assets/sort_by_alpha_desc.svg?raw';
import zoomInIcon from '../assets/zoom_in.svg?raw';
import zoomOutIcon from '../assets/zoom_out.svg?raw';

function inlineSvg(raw: string): string {
    return raw.replace(/fill="#[0-9a-fA-F]{3,8}"/g, 'fill="currentColor"');
}

const props = defineProps<{
    title: string;
    count: number;
    zoom: number;
    zoomMin: number;
    zoomMax: number;
    zoomStep: number;
    searchQuery: string;
    sortAscending: boolean;
}>();

const emit = defineEmits<{
    zoomIn: [];
    zoomOut: [];
    zoomSet: [value: number];
    reload: [];
    sort: [];
    search: [query: string];
}>();

const searchInputRef = ref<HTMLInputElement | null>(null);

const doSearch = useDebounceFn((query: string) => emit('search', query), 120);

function onSearchInput(e: Event): void {
    doSearch((e.target as HTMLInputElement).value);
}

function onClear(): void {
    emit('search', '');
    searchInputRef.value?.focus();
}

function onSlider(e: Event): void {
    const pct = Number((e.target as HTMLInputElement).value) || 100;
    emit('zoomSet', pct / 100);
}

function onKeydown(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        searchInputRef.value?.focus();
        searchInputRef.value?.select();
    }
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onUnmounted(() => window.removeEventListener('keydown', onKeydown));
</script>

<style scoped>
.header {
    position: sticky;
    top: 0;
    z-index: 5;
    background: linear-gradient(
        to bottom,
        var(--vscode-editor-background),
        color-mix(in srgb, var(--vscode-editor-background) 90%, transparent)
    );
    padding: 10px var(--pad);
    border-bottom: 1px solid var(--vscode-editorWidget-border, rgba(128, 128, 128, 0.25));
    display: flex;
    align-items: center;
    gap: 10px;
    overflow: hidden;
}

/* Title + count — collapse first when space is tight */
.title-group {
    display: flex;
    align-items: baseline;
    gap: 6px;
    flex: 0 9 auto;
    min-width: 0;
    overflow: hidden;
}

.title {
    font-weight: 600;
    opacity: 0.9;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    flex-shrink: 0;
}

.count {
    opacity: 0.6;
    font-size: 12px;
    white-space: nowrap;
    flex-shrink: 9;
    min-width: 0;
    overflow: hidden;
}

/* Search — grows to fill space, shrinks to minimum, capped at max */
.search {
    flex: 1 1 auto;
    min-width: 150px;
    max-width: 300px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
    border-radius: 6px;
    padding: 2px 6px 2px 8px;
    box-sizing: border-box;
    overflow: hidden;
}

.search input {
    flex: 1 1 0;
    min-width: 40px;
    width: 0; /* let flex determine actual width */
    background: transparent;
    color: inherit;
    border: none;
    outline: none;
    font: inherit;
    line-height: 1.6;
}

.search input::placeholder {
    color: var(--vscode-input-placeholderForeground);
    opacity: 0.8;
}

.icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    pointer-events: none;
    color: inherit;
}

.icon :deep(svg) {
    width: 16px;
    height: 16px;
    fill: currentColor;
}

.search button {
    appearance: none;
    border: none;
    background: transparent;
    color: var(--vscode-foreground);
    cursor: pointer;
    line-height: 1;
    padding: 2px 4px;
    border-radius: 4px;
    display: inline-flex;
    align-items: center;
}

.search button:hover {
    background: var(--vscode-list-hoverBackground);
}

.zoom {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex: 0 1 auto;
    min-width: 0;
    flex-shrink: 1;
}

.zoom button {
    width: 24px;
    height: 24px;
    padding: 0;
    border: 1px solid var(--vscode-button-border, var(--vscode-input-border));
    background: var(--vscode-button-secondaryBackground, var(--vscode-editorWidget-background));
    color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
    border-radius: 4px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.zoom button:hover {
    background: var(--vscode-button-secondaryHoverBackground, var(--vscode-list-hoverBackground));
}

.zoom input[type="range"] {
    width: 140px;
    min-width: 60px;
    flex: 1 1 60px;
    accent-color: var(--vscode-focusBorder);
}

.zoomPct {
    width: 4ch;
    opacity: .7;
    font-size: 12px;
}

.sort,
.reload {
    position: relative;
    z-index: 2;
    flex-shrink: 0;
    margin-left: 8px;
    width: 28px;
    height: 24px;
    padding: 0;
    border: 1px solid var(--vscode-button-border, var(--vscode-input-border));
    background: var(--vscode-button-secondaryBackground, var(--vscode-editorWidget-background));
    color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
    border-radius: 4px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.sort:hover,
.reload:hover {
    background: var(--vscode-button-secondaryHoverBackground, var(--vscode-list-hoverBackground));
}
</style>

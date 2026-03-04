<template>
    <div class="header">
        <div class="title">{{ title }}</div>
        <div class="count">{{ count }} items</div>

        <div class="search">
            <input
                ref="searchInputRef"
                type="text"
                :value="searchQuery"
                placeholder='Search (supports *, "exact")'
                aria-label="Search images"
                spellcheck="false"
                @input="onSearchInput"
            />
            <button title="Clear search" aria-label="Clear search" @click="onClear">✕</button>
        </div>

        <div class="zoom">
            <button title="Zoom Out (Ctrl+-)" aria-label="Zoom Out" @click="$emit('zoomOut')">−</button>
            <input
                type="range"
                :min="zoomMin * 100"
                :max="zoomMax * 100"
                :step="zoomStep * 100"
                :value="Math.round(zoom * 100)"
                aria-label="Zoom Level"
                @input="onSlider"
            />
            <button title="Zoom In (Ctrl+=)" aria-label="Zoom In" @click="$emit('zoomIn')">+</button>
            <span class="zoomPct">{{ Math.round(zoom * 100) }}%</span>
        </div>

        <button class="reload" title="Reload (F5)" aria-label="Reload" @click="$emit('reload')">⟳</button>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { debounce } from '../utils';

const props = defineProps<{
    title: string;
    count: number;
    zoom: number;
    zoomMin: number;
    zoomMax: number;
    zoomStep: number;
    searchQuery: string;
}>();

const emit = defineEmits<{
    zoomIn: [];
    zoomOut: [];
    zoomSet: [value: number];
    reload: [];
    search: [query: string];
}>();

const searchInputRef = ref<HTMLInputElement | null>(null);

const doSearch = debounce((query: string) => emit('search', query), 120);

function onSearchInput(e: Event): void {
    doSearch((e.target as HTMLInputElement).value);
}

function onClear(): void {
    if (searchInputRef.value) { searchInputRef.value.value = ''; }
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
}

.title {
    font-weight: 600;
    opacity: 0.9;
}

.count {
    opacity: 0.6;
    font-size: 12px;
}

.search {
    margin-left: 12px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
    border-radius: 6px;
    padding: 2px 6px 2px 8px;
}

.search input {
    width: 220px;
    max-width: 28vw;
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

.search button {
    appearance: none;
    border: none;
    background: transparent;
    color: var(--vscode-foreground);
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    padding: 2px 4px;
    border-radius: 4px;
}

.search button:hover {
    background: var(--vscode-list-hoverBackground);
}

.zoom {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.zoom button {
    min-width: 24px;
    height: 24px;
    padding: 0 6px;
    border: 1px solid var(--vscode-button-border, var(--vscode-input-border));
    background: var(--vscode-button-secondaryBackground, var(--vscode-editorWidget-background));
    color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
    border-radius: 4px;
    cursor: pointer;
}

.zoom button:hover {
    background: var(--vscode-button-secondaryHoverBackground, var(--vscode-list-hoverBackground));
}

.zoom input[type="range"] {
    width: 140px;
    accent-color: var(--vscode-focusBorder);
}

.zoomPct {
    width: 4ch;
    opacity: .7;
    font-size: 12px;
}

.reload {
    margin-left: 8px;
    min-width: 28px;
    width: 28px;
    height: 24px;
    padding: 0;
    border: 1px solid var(--vscode-button-border, var(--vscode-input-border));
    background: var(--vscode-button-secondaryBackground, var(--vscode-editorWidget-background));
    color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
    border-radius: 4px;
    cursor: pointer;
    line-height: 1;
}

.reload:hover {
    background: var(--vscode-button-secondaryHoverBackground, var(--vscode-list-hoverBackground));
}
</style>

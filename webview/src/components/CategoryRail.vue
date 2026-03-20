<template>
    <aside class="rail" :class="{ collapsed }" @contextmenu.prevent>
        <div class="rail-header">
            <h3>Categories</h3>
            <button
                class="toggle-btn"
                :title="collapsed ? 'Expand categories' : 'Collapse categories'"
                :aria-label="collapsed ? 'Expand categories' : 'Collapse categories'"
                :aria-expanded="!collapsed"
                :style="collapsed ? 'transform: rotate(180deg)' : ''"
                @click="$emit('toggle')"
            >
                <span class="icon" v-html="inlineSvg(chevronLeftIcon)" aria-hidden="true"></span>
            </button>
        </div>

        <Transition name="rail-content">
            <div v-show="!collapsed" class="rail-body">
                <div role="radiogroup" aria-label="Image Categories">
                    <label
                        v-for="(cat, i) in allCategories"
                        :key="cat"
                        class="radio"
                        role="radio"
                        :aria-checked="active === cat ? 'true' : 'false'"
                        @contextmenu.stop.prevent="$emit('contextmenu', { category: cat, clientX: $event.clientX, clientY: $event.clientY })"
                    >
                        <input
                            type="radio"
                            name="category"
                            :id="i === 0 ? 'all' : 'c' + (i - 1)"
                            :checked="active === cat"
                            @change="$emit('change', cat)"
                        />
                        <span>{{ cat }}</span>
                    </label>
                </div>
            </div>
        </Transition>
    </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import chevronLeftIcon from '../assets/chevron_left.svg?raw';
import { inlineSvg } from '../utils';

const props = defineProps<{
    categories: string[];
    active: string;
    collapsed: boolean;
}>();

defineEmits<{
    change: [category: string];
    toggle: [];
    contextmenu: [payload: { category: string; clientX: number; clientY: number }];
}>();

const allCategories = computed(() => ['All Images', ...props.categories]);
</script>

<style scoped>
.rail {
    border-right: 1px solid var(--vscode-editorWidget-border, rgba(128, 128, 128, 0.35));
    padding: var(--pad);
    box-sizing: border-box;
    overflow-x: hidden;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
}

.rail-body {
    overflow: hidden;
    min-width: calc(var(--rail-w) - 2 * var(--pad));
}

.rail-content-enter-active,
.rail-content-leave-active {
    transition: opacity var(--duration-fast) ease;
}

.rail-content-enter-from,
.rail-content-leave-to {
    opacity: 0;
}

.rail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: var(--btn-size);
    margin-bottom: 6px;
    flex-shrink: 0;
}

.rail h3 {
    margin: 0;
    font-size: var(--font);
    opacity: 0.9;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    overflow: hidden;
    white-space: nowrap;
    max-width: 200px;
    transition: opacity var(--duration-fast) ease, max-width var(--duration-base) ease;
}

.rail.collapsed h3 {
    opacity: 0;
    max-width: 0;
}

.toggle-btn {
    width: var(--btn-size);
    height: var(--btn-size);
    padding: 6px;
    appearance: none;
    border: none;
    background: transparent;
    color: var(--vscode-foreground);
    cursor: pointer;
    border-radius: var(--radius-sm);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    opacity: 0.6;
    transition: transform var(--duration-slow) ease;
}

.toggle-btn:hover {
    background: var(--vscode-list-hoverBackground, rgba(127, 127, 127, 0.1));
    opacity: 1;
}

.icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--icon-size);
    height: var(--icon-size);
    pointer-events: none;
}

.icon :deep(svg) {
    width: var(--icon-size);
    height: var(--icon-size);
    fill: currentColor;
}

.radio {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 4px;
    border-radius: var(--radius-md);
    cursor: pointer;
}

.radio:hover {
    background: var(--vscode-list-hoverBackground, rgba(127, 127, 127, 0.08));
}
</style>

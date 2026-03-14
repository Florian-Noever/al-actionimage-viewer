<template>
    <Teleport to="body">
        <div
            v-if="visible && item"
            ref="menuRef"
            class="ctxmenu"
            role="menu"
            :style="menuStyle"
            @keydown.escape="$emit('close')"
        >
            <button class="ctxitem" role="menuitem" data-action="copy-name" @click="doAction('copy-name')">Copy Name</button>
            <button class="ctxitem" role="menuitem" data-action="copy-image" @click="doAction('copy-image')">Copy Image</button>
            <button class="ctxitem" role="menuitem" data-action="export-image" @click="doAction('export-image')">Export Image</button>
        </div>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import type { ImageInformationDTO } from '../types/imageInformationDTO';

const props = defineProps<{
    visible: boolean;
    x: number;
    y: number;
    item: ImageInformationDTO | null;
}>();

const emit = defineEmits<{
    action: [action: string, item: ImageInformationDTO];
    close: [];
}>();

const menuRef = ref<HTMLElement | null>(null);
const menuX = ref(0);
const menuY = ref(0);

const menuStyle = computed(() => ({
    left: menuX.value + 'px',
    top: menuY.value + 'px',
}));

// Position menu at click location with automatic boundary adjustment
watch(() => props.visible, async (v) => {
    if (!v) {
        return;
    }
    menuX.value = props.x;
    menuY.value = props.y;
    await nextTick();
    if (!menuRef.value) {
        return;
    }
    // Ensure menu stays within viewport bounds
    const rect = menuRef.value.getBoundingClientRect();
    if (menuX.value + rect.width > window.innerWidth) {
        menuX.value = window.innerWidth - rect.width - 4;
    }
    if (menuY.value + rect.height > window.innerHeight) {
        menuY.value = window.innerHeight - rect.height - 4;
    }
});

function doAction(action: string): void {
    if (props.item) {
        emit('action', action, props.item);
    }
    emit('close');
}

function onMousedown(e: MouseEvent): void {
    if (props.visible && menuRef.value && !menuRef.value.contains(e.target as Node)) {
        emit('close');
    }
}

function onScroll(): void {
    if (props.visible) {
        emit('close');
    }
}

onMounted(() => {
    document.addEventListener('mousedown', onMousedown);
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    window.addEventListener('blur', () => emit('close'));
});

onUnmounted(() => {
    document.removeEventListener('mousedown', onMousedown);
    window.removeEventListener('scroll', onScroll, { capture: true });
});
</script>

<style scoped>
.ctxmenu {
    position: fixed;
    z-index: 9999;
    min-width: 180px;
    padding: 4px;
    border: 1px solid var(--vscode-menu-border, var(--vscode-input-border));
    background: var(--vscode-menu-background, var(--vscode-editorWidget-background));
    color: var(--vscode-foreground);
    border-radius: 6px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, .2);
}

.ctxitem {
    display: block;
    width: 100%;
    text-align: left;
    padding: 6px 10px;
    background: transparent;
    color: inherit;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font: inherit;
}

.ctxitem:hover, .ctxitem:focus {
    outline: none;
    background: var(--vscode-menu-selectionBackground, var(--vscode-list-hoverBackground));
    color: var(--vscode-menu-selectionForeground, var(--vscode-foreground));
}
</style>

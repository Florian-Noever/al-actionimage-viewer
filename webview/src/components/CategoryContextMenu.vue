<template>
    <Teleport to="body">
        <div
            v-if="visible && category !== null"
            ref="menuRef"
            class="ctxmenu"
            role="menu"
            aria-label="Category actions"
            tabindex="-1"
            :style="menuStyle"
            @keydown="onMenuKeydown"
        >
            <button class="ctxitem" role="menuitem" @click="doAction('copy-name')">Copy Name</button>
            <button class="ctxitem" role="menuitem" @click="doAction('export-images')">Export Images</button>
        </div>
    </Teleport>
</template>

<script setup lang="ts">
import { toRef } from 'vue';
import { useContextMenu } from '../composables/useContextMenu';

const props = defineProps<{
    visible: boolean;
    x: number;
    y: number;
    category: string | null;
}>();

const emit = defineEmits<{
    action: [action: string, category: string];
    close: [];
}>();

const { menuRef, menuStyle, onMenuKeydown } = useContextMenu(
    toRef(props, 'visible'),
    toRef(props, 'x'),
    toRef(props, 'y'),
    () => emit('close'),
);

function doAction(action: string): void {
    if (props.category !== null) {
        emit('action', action, props.category);
    }
    emit('close');
}
</script>

<style scoped>
.ctxmenu {
    position: fixed;
    z-index: var(--z-menu);
    min-width: 160px;
    padding: 4px;
    border: 1px solid var(--vscode-menu-border, var(--vscode-input-border));
    background: var(--vscode-menu-background, var(--vscode-editorWidget-background));
    color: var(--vscode-foreground);
    border-radius: var(--radius-md);
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
    border-radius: var(--radius-sm);
    cursor: pointer;
    font: inherit;
}

.ctxmenu:focus {
    outline: none;
}

.ctxitem:hover,
.ctxitem:focus {
    outline: none;
    background: var(--vscode-menu-selectionBackground, var(--vscode-list-hoverBackground));
    color: var(--vscode-menu-selectionForeground, var(--vscode-foreground));
}
</style>

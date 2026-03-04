<template>
    <div v-if="loading || error" class="status-pane" :class="{ error }" :role="error ? 'alert' : undefined" aria-live="polite">
        <template v-if="loading">
            <div class="spinner" aria-hidden="true"></div>
            <div class="status-text">{{ loadingMessage }}</div>
        </template>
        <template v-else-if="error">
            <div class="status-icon">⚠️</div>
            <div class="status-text">{{ errorMessage }}</div>
            <button class="retry" @click="$emit('retry')">Retry</button>
        </template>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    loading?: boolean;
    loadingMessage?: string;
    error?: boolean;
    errorMessage?: string;
}>();

defineEmits<{ retry: [] }>();
</script>

<style scoped>
.status-pane {
    position: absolute;
    inset: 60px var(--pad) var(--pad) var(--pad);
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: center;
    border: 1px dashed var(--vscode-panel-border, var(--vscode-editorWidget-border));
    border-radius: 8px;
    background: color-mix(in srgb, var(--vscode-editor-background) 80%, transparent);
    z-index: 10;
    padding: 16px;
}

.status-pane .status-text { opacity: .9; }

.spinner {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px solid color-mix(in srgb, var(--vscode-foreground) 30%, transparent);
    border-top-color: var(--vscode-progressBar-background, var(--vscode-focusBorder));
    animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.status-pane.error {
    border-style: solid;
    border-color: var(--vscode-inputValidation-errorBorder, var(--vscode-errorForeground));
    background: color-mix(in srgb, var(--vscode-editor-background) 92%, var(--vscode-errorForeground) 8%);
}

.retry {
    margin-left: 12px;
    padding: 4px 10px;
    border-radius: 6px;
    border: 1px solid var(--vscode-button-border, var(--vscode-input-border));
    background: var(--vscode-button-secondaryBackground, var(--vscode-editorWidget-background));
    color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
    cursor: pointer;
}

.retry:hover {
    background: var(--vscode-button-secondaryHoverBackground, var(--vscode-list-hoverBackground));
}
</style>

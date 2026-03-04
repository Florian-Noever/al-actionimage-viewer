<template>
    <aside class="rail">
        <h3>Categories</h3>
        <div role="radiogroup" aria-label="Image Categories">
            <label
                v-for="(cat, i) in allCategories"
                :key="cat"
                class="radio"
                role="radio"
                :aria-checked="active === cat ? 'true' : 'false'"
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
    </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    categories: string[];
    active: string;
}>();

defineEmits<{ change: [category: string] }>();

const allCategories = computed(() => ['All Images', ...props.categories]);
</script>

<style scoped>
.rail {
    border-right: 1px solid var(--vscode-editorWidget-border, rgba(128, 128, 128, 0.35));
    padding: var(--pad);
    box-sizing: border-box;
    overflow: auto;
}

.rail h3 {
    margin: 0 0 8px 0;
    font-size: 12px;
    opacity: 0.9;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.radio {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 4px;
    border-radius: 6px;
    cursor: pointer;
}

.radio:hover {
    background: var(--vscode-list-hoverBackground, rgba(127, 127, 127, 0.08));
}
</style>

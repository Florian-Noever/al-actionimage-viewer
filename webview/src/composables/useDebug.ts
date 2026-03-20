import { ref, onMounted, onUnmounted } from 'vue';

const CLASS = 'debug-borders';

export function useDebug() {
    const debugActive = ref(false);

    function toggle(): void {
        debugActive.value = !debugActive.value;
        document.documentElement.classList.toggle(CLASS, debugActive.value);
    }

    function onKeydown(e: KeyboardEvent): void {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
            e.preventDefault();
            toggle();
        }
    }

    onMounted(() => window.addEventListener('keydown', onKeydown));
    onUnmounted(() => window.removeEventListener('keydown', onKeydown));

    return { debugActive, toggle };
}

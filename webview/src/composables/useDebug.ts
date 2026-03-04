import { ref, onMounted, onUnmounted } from 'vue';

const CLASS = 'debug-borders';
const SESSION_KEY = 'al-viewer-debug';

export const debugActive = ref(false);

export function useDebug() {
    function toggle(): void {
        debugActive.value = !debugActive.value;
        document.documentElement.classList.toggle(CLASS, debugActive.value);
        try { sessionStorage.setItem(SESSION_KEY, String(debugActive.value)); } catch { /* swallow */ }
    }

    function onKeydown(e: KeyboardEvent): void {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
            e.preventDefault();
            toggle();
        }
    }

    onMounted(() => {
        // Restore state across hot reloads
        try {
            if (sessionStorage.getItem(SESSION_KEY) === 'true') {
                debugActive.value = true;
                document.documentElement.classList.add(CLASS);
            }
        } catch { /* swallow */ }

        window.addEventListener('keydown', onKeydown);
    });

    onUnmounted(() => window.removeEventListener('keydown', onKeydown));

    return { debugActive, toggle };
}

import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import type { Ref } from 'vue';

/**
 * Shared context-menu positioning, keyboard navigation, and focus-trap logic.
 *
 * @param visible - reactive boolean indicating whether the menu is open
 * @param xProp   - reactive x coordinate from the triggering click
 * @param yProp   - reactive y coordinate from the triggering click
 * @param emitClose - callback to emit the 'close' event from the host component
 */
export function useContextMenu(visible: Ref<boolean>, xProp: Ref<number>, yProp: Ref<number>, emitClose: () => void) {
    const menuRef = ref<HTMLElement | null>(null);
    const menuX = ref(0);
    const menuY = ref(0);
    const returnFocus = ref<HTMLElement | null>(null);

    const menuStyle = computed(() => ({
        left: menuX.value + 'px',
        top: menuY.value + 'px',
    }));

    // Position menu at click location with automatic boundary adjustment
    watch(visible, async (v) => {
        if (v) {
            returnFocus.value = document.activeElement as HTMLElement | null;
            menuX.value = xProp.value;
            menuY.value = yProp.value;
            await nextTick();
            if (!menuRef.value) {
                return;
            }
            const rect = menuRef.value.getBoundingClientRect();
            if (menuX.value + rect.width > window.innerWidth) {
                menuX.value = window.innerWidth - rect.width - 4;
            }
            if (menuY.value + rect.height > window.innerHeight) {
                menuY.value = window.innerHeight - rect.height - 4;
            }
            menuRef.value.focus();
        } else {
            returnFocus.value?.focus();
            returnFocus.value = null;
        }
    });

    function onMenuKeydown(e: KeyboardEvent): void {
        const items = Array.from(menuRef.value?.querySelectorAll('[role="menuitem"]') ?? []) as HTMLElement[];
        const current = items.indexOf(document.activeElement as HTMLElement);
        if (e.key === 'Escape') {
            emitClose();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            items[current === -1 ? 0 : (current + 1) % items.length]?.focus();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            items[current === -1 ? items.length - 1 : (current - 1 + items.length) % items.length]?.focus();
        } else if (e.key === 'Tab') {
            e.preventDefault();
            emitClose();
        }
    }

    function onMousedown(e: MouseEvent): void {
        if (visible.value && menuRef.value && !menuRef.value.contains(e.target as Node)) {
            returnFocus.value = null; // User clicked elsewhere intentionally; don't steal focus back
            emitClose();
        }
    }

    function onScroll(): void {
        if (visible.value) {
            emitClose();
        }
    }

    function onBlur(): void {
        emitClose();
    }

    onMounted(() => {
        document.addEventListener('mousedown', onMousedown);
        window.addEventListener('scroll', onScroll, { capture: true, passive: true });
        window.addEventListener('blur', onBlur);
    });

    onUnmounted(() => {
        document.removeEventListener('mousedown', onMousedown);
        window.removeEventListener('scroll', onScroll, { capture: true });
        window.removeEventListener('blur', onBlur);
    });

    return { menuRef, menuStyle, onMenuKeydown };
}

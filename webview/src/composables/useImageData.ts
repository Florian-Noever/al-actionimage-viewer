import { ref } from 'vue';
import type { ImageMap } from '../types/imageInformationDTO';
import type { ExtensionMessage } from '../types/extensionMessages';

/**
 * Manages image data, loading state, and error state.
 * Provides a message handler to be called from App.vue's window 'message' listener.
 */
export function useImageData() {
    const data = ref<ImageMap>({});
    const categories = ref<string[]>([]);
    const activeCategory = ref('All Images');

    const loading = ref(false);
    const loadingMessage = ref('Loading images...');
    const hasError = ref(false);
    const errorMessage = ref('');

    function showLoading(message = 'Loading...'): void {
        hasError.value = false;
        loadingMessage.value = message;
        loading.value = true;
    }

    function hideLoading(): void {
        loading.value = false;
    }

    function showError(message: string): void {
        loading.value = false;
        errorMessage.value = message || 'An unknown error occurred.';
        hasError.value = true;
    }

    function setCategory(cat: string): void {
        activeCategory.value = cat;
    }

    function onDataMessage(msg: ExtensionMessage): void {
        switch (msg.type) {
            case 'loading':
                showLoading(msg.payload.message || 'Loading...');
                break;
            case 'error':
                showError(msg.payload.message || 'Failed to load.');
                break;
            case 'setData':
                hideLoading();
                hasError.value = false;
                data.value = msg.payload || {};
                categories.value = Object.keys(data.value);
                activeCategory.value = 'All Images';
                break;
        }
    }

    return {
        data,
        categories,
        activeCategory,
        loading,
        loadingMessage,
        hasError,
        errorMessage,
        showLoading,
        showError,
        setCategory,
        onDataMessage,
    };
}

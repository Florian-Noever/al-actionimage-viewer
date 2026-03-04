import { ref, computed } from 'vue';
import { makeSearchPredicate } from '../utils';
import type { ImageInformationDTO, ImageMap } from '../types/imageInformationDTO';

export function useSearch(data: { value: ImageMap }, categories: { value: string[] }, activeCategory: { value: string }) {
    const searchQuery = ref('');

    const currentItems = computed<ImageInformationDTO[]>(() => {
        const base = activeCategory.value === 'All Images'
            ? categories.value.flatMap(c => data.value[c] ?? [])
            : (data.value[activeCategory.value] ?? []);

        const pred = makeSearchPredicate(searchQuery.value);
        return base.filter(it => pred(it.name ?? ''));
    });

    return { searchQuery, currentItems };
}

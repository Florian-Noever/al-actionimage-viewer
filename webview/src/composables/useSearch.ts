import { ref, computed } from 'vue';
import { makeSearchPredicate } from '../utils';
import type { ImageInformationDTO, ImageMap } from '../types/imageInformationDTO';

export function useSearch(data: { value: ImageMap }, categories: { value: string[] }, activeCategory: { value: string }) {
    const searchQuery = ref('');
    const sortAscending = ref(true);

    const currentItems = computed<ImageInformationDTO[]>(() => {
        let base: ImageInformationDTO[];
        if (activeCategory.value === 'All Images') {
            // Deduplicate by name across all categories
            const seen = new Set<string>();
            base = [];
            for (const c of categories.value) {
                for (const item of data.value[c] ?? []) {
                    const key = item.name ?? '';
                    if (!seen.has(key)) {
                        seen.add(key);
                        base.push(item);
                    }
                }
            }
        } else {
            base = data.value[activeCategory.value] ?? [];
        }

        const pred = makeSearchPredicate(searchQuery.value);
        const filtered = base.filter(it => pred(it.name ?? ''));
        return [...filtered].sort((a, b) => {
            const cmp = (a.name ?? '').localeCompare(b.name ?? '');
            return sortAscending.value ? cmp : -cmp;
        });
    });

    function toggleSort(): void {
        sortAscending.value = !sortAscending.value;
    }

    return { searchQuery, currentItems, sortAscending, toggleSort };
}

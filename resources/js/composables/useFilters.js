import { ref, watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { debounce } from 'lodash';

/**
 * useFilters Composable
 * 
 * Sincroniza um objeto reativo de filtros com a URL (query params).
 * - Lê da URL ao iniciar
 * - Escreve na URL quando filtros mudam
 * 
 * @param {Object} storeFilters - Ref ou Reactive object do store que contém os filtros
 * @param {Function} refreshCallback - Função para recarregar dados quando filtro mudar
 * @param {Object} defaultFilters - Valores padrão para ignorar na URL
 */
export function useFilters(storeFilters, refreshCallback, defaultFilters = {}) {
    const router = useRouter();
    const route = useRoute();
    const isInitialized = ref(false);

    // Mapeia query params para o store na montagem
    onMounted(() => {
        const query = route.query;
        let hasChanges = false;
        const newFilters = { ...storeFilters.value };

        Object.keys(newFilters).forEach(key => {
            if (query[key] !== undefined) {
                newFilters[key] = query[key];
                hasChanges = true;
            }
        });

        if (hasChanges) {
            storeFilters.value = newFilters;
        }

        isInitialized.value = true;
        refreshCallback();
    });

    // Atualiza URL quando store muda
    const updateUrl = debounce((newFilters) => {
        if (!isInitialized.value) return;

        const query = { ...route.query };

        // Remove page on filter change to reset pagination
        delete query.page;

        Object.keys(newFilters).forEach(key => {
            const value = newFilters[key];
            const defaultValue = defaultFilters[key] !== undefined ? defaultFilters[key] : '';

            if (value !== defaultValue && value !== null && value !== undefined) {
                query[key] = value;
            } else {
                delete query[key];
            }
        });

        router.replace({ query });
        refreshCallback();
    }, 300);

    // Observa mudanças profundas nos filtros do store
    watch(
        storeFilters,
        (newFilters) => {
            updateUrl(newFilters);
        },
        { deep: true }
    );

    return {
        isInitialized
    };
}

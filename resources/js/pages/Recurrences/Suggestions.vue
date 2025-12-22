<template>
    <div>
        <!-- Page header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Assinaturas Detectadas</h1>
                <p class="text-gray-500 dark:text-gray-400">Sugestões inteligentes baseadas no seu histórico</p>
            </div>
            <button @click="refreshSuggestions" class="btn-secondary" :disabled="loading">
                <svg class="w-5 h-5 mr-2" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Atualizar
            </button>
        </div>

        <!-- Info Banner -->
        <DismissableBanner storage-key="suggestions-info" color="purple">
            <template #icon>
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
            </template>
            Analisamos suas despesas dos últimos 6 meses para encontrar padrões de cobrança recorrentes.
            Você pode criar recorrências automáticas ou ignorar as sugestões.
        </DismissableBanner>

        <!-- Loading -->
        <div v-if="loading" class="flex justify-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>

        <!-- Empty State -->
        <div v-else-if="suggestions.length === 0" class="card text-center py-12">
            <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhuma assinatura detectada</h3>
            <p class="text-gray-500">Continue usando o app e voltaremos com sugestões!</p>
        </div>

        <!-- Suggestions List -->
        <div v-else class="space-y-4">
            <div 
                v-for="suggestion in suggestions" 
                :key="suggestion.description_pattern"
                class="card hover:shadow-lg transition-shadow"
            >
                <div class="flex flex-col lg:flex-row lg:items-center gap-4">
                    <!-- Left: Info -->
                    <div class="flex-1">
                        <div class="flex items-center gap-3 mb-2">
                            <div class="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </div>
                            <div>
                                <h3 class="font-semibold text-gray-900 dark:text-white">{{ suggestion.description }}</h3>
                                <p class="text-sm text-gray-500">
                                    {{ suggestion.interval }} · {{ suggestion.occurrences }} ocorrências
                                </p>
                            </div>
                        </div>
                        
                        <!-- Confidence bar -->
                        <div class="flex items-center gap-2 mb-2">
                            <span class="text-xs text-gray-500">Confiança:</span>
                            <div class="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden max-w-xs">
                                <div 
                                    class="h-full rounded-full transition-all"
                                    :class="getConfidenceClass(suggestion.confidence)"
                                    :style="{ width: (suggestion.confidence * 100) + '%' }"
                                ></div>
                            </div>
                            <span class="text-xs font-medium" :class="getConfidenceTextClass(suggestion.confidence)">
                                {{ Math.round(suggestion.confidence * 100) }}%
                            </span>
                        </div>

                        <!-- Value change alert -->
                        <div v-if="suggestion.value_change" class="flex items-center gap-2 text-sm">
                            <svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span class="text-amber-600 dark:text-amber-400">
                                Valor alterou de {{ formatCurrency(suggestion.value_change.from) }} 
                                para {{ formatCurrency(suggestion.value_change.to) }}
                                ({{ suggestion.value_change.change_percent > 0 ? '+' : '' }}{{ suggestion.value_change.change_percent }}%)
                            </span>
                        </div>

                        <p class="text-xs text-gray-400 mt-1">
                            Última cobrança: {{ formatDate(suggestion.last_occurrence) }}
                        </p>
                    </div>

                    <!-- Right: Value & Actions -->
                    <div class="flex flex-col items-end gap-3">
                        <div class="text-right">
                            <p class="text-2xl font-bold text-red-600">
                                -{{ formatCurrency(suggestion.amount_last || suggestion.amount_avg) }}
                            </p>
                            <p class="text-xs text-gray-500">por {{ suggestion.interval.toLowerCase() }}</p>
                        </div>
                        
                        <div class="flex gap-2">
                            <button 
                                @click="ignoreSuggestion(suggestion)"
                                class="btn-secondary text-sm"
                            >
                                Ignorar
                            </button>
                            <button 
                                @click="createRecurring(suggestion)"
                                class="btn-primary text-sm"
                                :disabled="creating"
                            >
                                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                                </svg>
                                Criar Recorrência
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useUiStore } from '@/stores/ui';
import DismissableBanner from '@/components/Common/DismissableBanner.vue';

const uiStore = useUiStore();

const loading = ref(true);
const creating = ref(false);
const suggestions = ref([]);
const ignoredSuggestions = ref(new Set(JSON.parse(localStorage.getItem('ignored_suggestions') || '[]')));

async function fetchSuggestions() {
    loading.value = true;
    try {
        const response = await axios.get('/api/recurrences/suggestions');
        // Filter out ignored suggestions
        suggestions.value = response.data.data.filter(
            s => !ignoredSuggestions.value.has(s.description_pattern)
        );
    } catch (error) {
        uiStore.showToast('Erro ao carregar sugestões', 'error');
    } finally {
        loading.value = false;
    }
}

async function refreshSuggestions() {
    await fetchSuggestions();
    uiStore.showToast('Sugestões atualizadas', 'success');
}

async function createRecurring(suggestion) {
    creating.value = true;
    try {
        await axios.post('/api/recurrences/suggestions/create', suggestion);
        uiStore.showToast(`Recorrência "${suggestion.description}" criada!`, 'success');
        // Remove from list
        suggestions.value = suggestions.value.filter(s => s.description_pattern !== suggestion.description_pattern);
    } catch (error) {
        uiStore.showToast('Erro ao criar recorrência', 'error');
    } finally {
        creating.value = false;
    }
}

function ignoreSuggestion(suggestion) {
    ignoredSuggestions.value.add(suggestion.description_pattern);
    localStorage.setItem('ignored_suggestions', JSON.stringify([...ignoredSuggestions.value]));
    suggestions.value = suggestions.value.filter(s => s.description_pattern !== suggestion.description_pattern);
    uiStore.showToast('Sugestão ignorada', 'info');
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value || 0);
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('pt-BR');
}

function getConfidenceClass(confidence) {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-orange-500';
}

function getConfidenceTextClass(confidence) {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-orange-600';
}

onMounted(() => {
    fetchSuggestions();
});
</script>

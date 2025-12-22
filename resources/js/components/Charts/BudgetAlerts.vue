<template>
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-100 dark:border-gray-700 font-sans h-full">
        <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
            <svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Alertas de Orçamento
        </h3>
        
        <div v-if="loading" class="flex items-center justify-center p-8">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
        </div>

        <div v-else-if="!alerts.length" class="flex flex-col items-center justify-center h-48 text-gray-400 text-center">
            <svg class="w-10 h-10 mb-2 opacity-30 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-sm">Tudo sob controle!</p>
            <p class="text-xs mt-1">Nenhum orçamento em risco.</p>
        </div>

        <div v-else class="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            <div v-for="alert in alerts" :key="alert.id" 
                class="p-3 rounded-md border text-xs"
                :class="alertStatusClass(alert.percentage)"
            >
                <div class="flex justify-between items-center mb-1">
                    <span class="font-bold">{{ alert.category }}</span>
                    <span class="font-mono">{{ alert.percentage }}%</span>
                </div>
                <div class="w-full bg-black/10 rounded-full h-1.5 overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-300"
                        :class="progressBarClass(alert.percentage)"
                        :style="{ width: `${Math.min(100, alert.percentage)}%` }"
                    ></div>
                </div>
                <div class="mt-1 text-right text-[10px] opacity-80">
                    {{ alert.remaining > 0 ? `Resta: ${formatCurrency(alert.remaining)}` : `Excedido: ${formatCurrency(Math.abs(alert.remaining))}` }}
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import axios from 'axios';

const props = defineProps({
    filters: {
        type: Object,
        required: true
    }
});

const loading = ref(false);
const alerts = ref([]);

function alertStatusClass(percentage) {
    if (percentage >= 100) return 'bg-red-50 border-red-100 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300';
    return 'bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300';
}

function progressBarClass(percentage) {
    if (percentage >= 100) return 'bg-red-500';
    return 'bg-amber-500';
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

async function fetchData() {
    loading.value = true;
    try {
        const response = await axios.get('/api/reports/budget-alerts', { params: props.filters });
        alerts.value = response.data.data || [];
    } catch (error) {
        console.error('Error fetching budget alerts:', error);
        alerts.value = [];
    } finally {
        loading.value = false;
    }
}

watch(() => props.filters, fetchData, { deep: true });
onMounted(fetchData);
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: #d1d5db;
    border-radius: 20px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: #4b5563;
}
</style>

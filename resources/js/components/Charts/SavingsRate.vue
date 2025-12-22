<template>
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-100 dark:border-gray-700">
        <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Taxa de Poupança</h3>
        
        <div v-if="loading" class="animate-pulse space-y-4">
            <div class="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        </div>

        <div v-else class="space-y-4">
            <!-- KPI Value -->
            <div class="flex items-end gap-3">
                <span class="text-3xl font-bold" :class="rateColor">
                    {{ formatPercent(data.rate) }}
                </span>
                <span class="text-sm text-gray-500 mb-1">
                    Economizado: {{ formatCurrency(data.savings) }}
                </span>
            </div>

            <!-- Visual Bar -->
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                <div 
                    class="h-2.5 rounded-full transition-all duration-500" 
                    :class="barColor"
                    :style="{ width: `${Math.max(0, Math.min(100, data.rate))}%` }"
                ></div>
            </div>

            <!-- Details -->
            <div class="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-gray-100 dark:border-gray-700">
                <div>
                    <span class="block text-gray-500">Receitas</span>
                    <span class="font-medium text-green-600 dark:text-green-400">
                        {{ formatCurrency(data.income) }}
                    </span>
                </div>
                <div class="text-right">
                    <span class="block text-gray-500">Despesas</span>
                    <span class="font-medium text-red-600 dark:text-red-400">
                        {{ formatCurrency(data.expenses) }}
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import axios from 'axios';

const props = defineProps({
    filters: {
        type: Object,
        required: true
    }
});

const loading = ref(true);
const data = ref({
    rate: 0,
    savings: 0,
    income: 0,
    expenses: 0
});

const rateColor = computed(() => {
    if (data.value.rate >= 20) return 'text-green-600 dark:text-green-400';
    if (data.value.rate >= 0) return 'text-blue-600 dark:text-blue-400';
    return 'text-red-600 dark:text-red-400';
});

const barColor = computed(() => {
    if (data.value.rate >= 20) return 'bg-green-600 dark:bg-green-500';
    if (data.value.rate >= 0) return 'bg-blue-600 dark:bg-blue-500';
    return 'bg-red-600 dark:bg-red-500';
});

async function fetchData() {
    loading.value = true;
    try {
        const response = await axios.get('/api/reports/savings-rate', { params: props.filters });
        data.value = response.data.data;
    } catch (error) {
        console.error('Error fetching savings rate:', error);
    } finally {
        loading.value = false;
    }
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatPercent(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    }).format(value / 100);
}

watch(() => props.filters, fetchData, { deep: true });
onMounted(fetchData);
</script>

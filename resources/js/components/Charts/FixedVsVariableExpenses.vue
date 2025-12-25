<template>
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-100 dark:border-gray-700 font-sans">
        <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Fixas vs Variáveis</h3>
        
        <div v-if="loading" class="h-64 flex items-center justify-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>

        <div v-else-if="!hasData" class="h-64 flex flex-col items-center justify-center text-gray-400 text-center px-4">
            <svg class="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
            <p class="font-medium">Sem despesas no período</p>
            <p class="text-sm mt-1">Registre despesas para visualizar a proporção entre gastos fixos e variáveis.</p>
        </div>

        <div v-else class="h-64">
            <BaseChart 
                type="pie"
                :data="chartData"
                :options="chartOptions"
            />
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import axios from 'axios';
import BaseChart from './BaseChart.vue';

const props = defineProps({
    filters: {
        type: Object,
        required: true
    }
});

const loading = ref(false);
const rawData = ref(null);

const hasData = computed(() => {
    return rawData.value && (rawData.value.fixed > 0 || rawData.value.variable > 0);
});

const chartData = computed(() => {
    if (!rawData.value) return {};
    
    return {
        labels: ['Fixas (Recorrentes)', 'Variáveis'],
        datasets: [{
            data: [rawData.value.fixed, rawData.value.variable],
            backgroundColor: ['#6366F1', '#F59E0B'], // Indigo and Amber
            borderWidth: 0,
            hoverOffset: 4
        }]
    };
});

const chartOptions = {
    plugins: {
        legend: {
            position: 'bottom',
        },
        tooltip: {
            callbacks: {
                label: function(context) {
                    let label = context.label || '';
                    if (label) {
                        label += ': ';
                    }
                    if (context.parsed !== null) {
                        label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed);
                    }
                    // Add percentage
                    const percentage = context.dataIndex === 0 ? rawData.value.fixed_pct : rawData.value.variable_pct;
                    label += ` (${percentage}%)`;
                    return label;
                }
            }
        }
    }
};

async function fetchData() {
    loading.value = true;
    try {
        const response = await axios.get('/api/reports/fixed-vs-variable', { params: props.filters });
        rawData.value = response.data.data || null;
    } catch (error) {
        console.error('Error fetching fixed vs variable:', error);
        rawData.value = null;
    } finally {
        loading.value = false;
    }
}

watch(() => props.filters, fetchData, { deep: true });
onMounted(fetchData);
</script>

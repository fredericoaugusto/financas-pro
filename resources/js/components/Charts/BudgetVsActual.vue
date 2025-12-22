<template>
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-100 dark:border-gray-700 font-sans">
        <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Orçado vs Realizado</h3>
        
        <div v-if="loading" class="h-64 flex items-center justify-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>

        <div v-else-if="!hasData" class="h-64 flex flex-col items-center justify-center text-gray-400">
            <svg class="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>Nenhum orçamento definido para este mês</p>
        </div>

        <div v-else class="h-64">
            <BaseChart 
                type="bar"
                :data="chartData"
                :options="chartOptions"
                height="100%"
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
    return rawData.value && rawData.value.budgeted > 0;
});

const chartData = computed(() => {
    if (!rawData.value) return {};

    return {
        labels: ['Total'],
        datasets: [
            {
                label: 'Orçado',
                data: [rawData.value.budgeted],
                backgroundColor: '#9CA3AF', // Gray-400
                borderRadius: 4,
                barPercentage: 0.6
            },
            {
                label: 'Realizado',
                data: [rawData.value.actual],
                backgroundColor: rawData.value.actual > rawData.value.budgeted ? '#EF4444' : '#3B82F6', // Blue-500 or Red if exceeded
                borderRadius: 4,
                barPercentage: 0.6
            }
        ]
    };
});

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'bottom',
        },
        tooltip: {
            callbacks: {
                label: function(context) {
                    let label = context.dataset.label || '';
                    if (label) {
                        label += ': ';
                    }
                    if (context.parsed.y !== null) {
                        label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
                    }
                    return label;
                }
            }
        }
    },
    scales: {
        y: {
            beginAtZero: true,
            ticks: {
                callback: function(value) {
                    return new Intl.NumberFormat('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL', 
                        notation: 'compact' 
                    }).format(value);
                }
            }
        },
        x: {
            grid: {
                display: false
            }
        }
    }
};

async function fetchData() {
    loading.value = true;
    try {
        const response = await axios.get('/api/reports/budget-vs-actual', { params: props.filters });
        rawData.value = response.data.data;
    } catch (error) {
        console.error('Error fetching budget data:', error);
        rawData.value = null;
    } finally {
        loading.value = false;
    }
}

watch(() => props.filters, fetchData, { deep: true });
onMounted(fetchData);
</script>

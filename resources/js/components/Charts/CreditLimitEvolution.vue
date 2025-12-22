<template>
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-100 dark:border-gray-700 font-sans">
        <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Evolução do Limite Usado</h3>
        
        <div v-if="loading" class="h-64 flex items-center justify-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>

        <div v-else-if="!hasData" class="h-64 flex flex-col items-center justify-center text-gray-400">
            <svg class="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <p>Sem histórico de faturas</p>
            <p class="text-sm mt-1">Gere faturas para ver o gráfico.</p>
        </div>

        <div v-else class="h-64">
            <BaseChart 
                type="line"
                :data="chartData"
                :options="chartOptions"
            />
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';
import BaseChart from './BaseChart.vue';

// Filters are ignored here for simplicity in history visualization, but passed if needed
const props = defineProps({
    filters: {
        type: Object,
        default: () => ({})
    }
});

const loading = ref(false);
const rawData = ref([]);

const hasData = computed(() => {
    return rawData.value && rawData.value.length > 0;
});

const chartData = computed(() => {
    return {
        labels: rawData.value.map(item => {
            const [year, month] = item.month.split('-');
            return `${month}/${year}`;
        }),
        datasets: [
            {
                label: 'Total Faturas',
                data: rawData.value.map(item => item.used),
                borderColor: '#3B82F6', // Blue-500
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            },
            {
                label: 'Limite Total Atual',
                data: rawData.value.map(item => item.limit),
                borderColor: '#9CA3AF', // Gray-400
                borderWidth: 2,
                borderDash: [5, 5],
                fill: false,
                pointRadius: 0
            }
        ]
    };
});

const chartOptions = {
    plugins: {
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
            grid: {
                color: '#f3f4f6'
            },
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
        const response = await axios.get('/api/reports/credit-limit-evolution');
        rawData.value = response.data.data || [];
    } catch (error) {
        console.error('Error fetching credit limit evolution:', error);
        rawData.value = [];
    } finally {
        loading.value = false;
    }
}

onMounted(fetchData);
</script>

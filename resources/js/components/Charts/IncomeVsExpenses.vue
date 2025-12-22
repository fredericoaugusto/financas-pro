<template>
    <div class="card h-full flex flex-col">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Receitas vs Despesas</h3>
        
        <div v-if="loading" class="flex-1 flex items-center justify-center min-h-[300px]">
             <svg class="animate-spin h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        </div>

        <div v-else-if="!hasData" class="flex-1 flex flex-col items-center justify-center min-h-[300px] text-gray-500">
             <svg class="w-12 h-12 mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p>Sem dados para o período</p>
        </div>

        <div v-else class="flex-1 min-h-[300px]">
            <BaseChart
                type="bar"
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
const rawData = ref([]);

const hasData = computed(() => rawData.value.length > 0);

const chartData = computed(() => {
    return {
        labels: rawData.value.map(item => item.month),
        datasets: [
            {
                label: 'Receita',
                data: rawData.value.map(item => item.receita),
                backgroundColor: '#22c55e', // Green-500
                borderRadius: 4,
            },
            {
                label: 'Despesa',
                data: rawData.value.map(item => item.despesa),
                backgroundColor: '#ef4444', // Red-500
                borderRadius: 4,
            }
        ]
    };
});

const chartOptions = {
    scales: {
        y: {
            beginAtZero: true,
            grid: {
                color: '#e5e7eb'
            }
        },
        x: {
            grid: {
                display: false
            }
        }
    },
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
    }
};

async function fetchData() {
    loading.value = true;
    try {
        const response = await axios.get('/api/reports/monthly-evolution', { params: props.filters });
        rawData.value = response.data.data || [];
    } catch (error) {
        console.error('Error fetching income vs expenses:', error);
        rawData.value = [];
    } finally {
        loading.value = false;
    }
}

watch(() => props.filters, fetchData, { deep: true });

onMounted(fetchData);
</script>

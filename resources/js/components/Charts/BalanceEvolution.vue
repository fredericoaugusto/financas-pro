<template>
    <div class="card h-full flex flex-col">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Evolução do Saldo (Acumulado)</h3>
        
        <div v-if="loading" class="flex-1 flex items-center justify-center min-h-[300px]">
             <svg class="animate-spin h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        </div>

        <div v-else-if="!hasData" class="flex-1 flex flex-col items-center justify-center min-h-[300px] text-gray-500 text-center px-4">
             <svg class="w-12 h-12 mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            <p class="font-medium">Nenhum lançamento no período selecionado</p>
            <p class="text-sm text-gray-400 mt-1">Registre transações para visualizar a evolução do saldo.</p>
        </div>

        <div v-else class="flex-1 min-h-[300px]">
            <BaseChart
                type="line"
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
        labels: rawData.value.map(item => item.month), // YYYY-MM
        datasets: [{
            label: 'Saldo Acumulado',
            data: rawData.value.map(item => item.accumulated_balance),
            borderColor: '#3b82f6', // Blue-500
            backgroundColor: '#3b82f620',
            fill: true,
            tension: 0.4 // Smooth curve
        }]
    };
});

const chartOptions = {
    scales: {
        y: {
            beginAtZero: false,
            grid: {
                color: '#e5e7eb' // gray-200
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
        console.error('Error fetching balance evolution:', error);
        rawData.value = [];
    } finally {
        loading.value = false;
    }
}

watch(() => props.filters, fetchData, { deep: true });

onMounted(fetchData);
</script>

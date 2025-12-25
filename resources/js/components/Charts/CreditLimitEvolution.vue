<template>
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-100 dark:border-gray-700 font-sans">
        <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Uso do Limite por Cartão</h3>
        
        <div v-if="loading" class="h-64 flex items-center justify-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>

        <div v-else-if="!hasData" class="h-64 flex flex-col items-center justify-center text-gray-400 text-center px-4">
            <svg class="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <p class="font-medium">Nenhum cartão de crédito cadastrado</p>
            <p class="text-sm mt-1">Cadastre cartões para visualizar o uso do limite.</p>
        </div>

        <div v-else class="h-64">
            <BaseChart 
                type="bar"
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

const loading = ref(false);
const rawData = ref([]);

const hasData = computed(() => {
    return rawData.value && rawData.value.length > 0;
});

const chartData = computed(() => {
    return {
        labels: rawData.value.map(item => item.name),
        datasets: [
            {
                label: 'Usado',
                data: rawData.value.map(item => item.used),
                backgroundColor: '#3B82F6', // Blue-500
                borderRadius: 4,
                barPercentage: 0.6
            },
            {
                label: 'Disponível',
                data: rawData.value.map(item => item.available),
                backgroundColor: '#D1D5DB', // Gray-300
                borderRadius: 4,
                barPercentage: 0.6
            }
        ]
    };
});

const chartOptions = {
    indexAxis: 'y',
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
                    if (context.parsed.x !== null) {
                        label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.x);
                    }
                    return label;
                }
            }
        }
    },
    scales: {
        x: {
            stacked: true,
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
        y: {
            stacked: true,
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

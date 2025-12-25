<template>
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-100 dark:border-gray-700 font-sans">
        <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Comprometimento Futuro (Parcelas a Vencer)</h3>
        
        <div v-if="loading" class="h-64 flex items-center justify-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>

        <div v-else-if="!hasData" class="h-64 flex flex-col items-center justify-center text-gray-400 text-center px-4">
            <svg class="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p class="font-medium">Nenhum compromisso futuro registrado</p>
            <p class="text-sm mt-1">Você não tem parcelas ou compras parceladas a vencer nos próximos meses.</p>
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
        labels: rawData.value.map(item => {
            const [year, month] = item.month.split('-');
            return `${month}/${year}`;
        }),
        datasets: [
            {
                label: 'Total a Vencer',
                data: rawData.value.map(item => item.total),
                backgroundColor: '#F59E0B', // Amber-500
                borderRadius: 4
            }
        ]
    };
});

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: false
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
        const response = await axios.get('/api/reports/future-commitment');
        rawData.value = response.data.data || [];
    } catch (error) {
        console.error('Error fetching future commitment:', error);
        rawData.value = [];
    } finally {
        loading.value = false;
    }
}

onMounted(fetchData);
</script>

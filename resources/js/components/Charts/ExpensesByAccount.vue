<template>
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-100 dark:border-gray-700 font-sans">
        <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Despesas por Conta</h3>
        
        <div v-if="loading" class="h-64 flex items-center justify-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>

        <div v-else-if="!hasData" class="h-64 flex flex-col items-center justify-center text-gray-400">
            <svg class="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <p>Sem despesas no período</p>
        </div>

        <div v-else class="h-64">
            <BaseChart 
                type="doughnut"
                :data="chartData"
                :options="chartOptions"
                height="100%"
                @click="handleClick"
            />
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import BaseChart from './BaseChart.vue';

const props = defineProps({
    filters: {
        type: Object,
        required: true
    }
});

const router = useRouter();
const loading = ref(false);
const rawData = ref([]);

const hasData = computed(() => {
    return rawData.value && rawData.value.length > 0 && rawData.value.some(item => item.despesa > 0);
});

const chartData = computed(() => {
    // Filter out accounts with 0 expenses
    const activeItems = rawData.value.filter(item => item.despesa > 0);

    return {
        labels: activeItems.map(item => item.name),
        datasets: [{
            data: activeItems.map(item => item.despesa),
            backgroundColor: activeItems.map(item => item.color),
            borderWidth: 0,
            hoverOffset: 4
        }]
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
                    let label = context.label || '';
                    if (label) {
                        label += ': ';
                    }
                    if (context.parsed !== null) {
                        label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed);
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
        const response = await axios.get('/api/reports/by-account', { params: props.filters });
        // Response contains objects with { account_id, name, color, receita, despesa, saldo }
        rawData.value = response.data.data || [];
    } catch (error) {
        console.error('Error fetching expenses by account:', error);
        rawData.value = [];
    } finally {
        loading.value = false;
    }
}

function handleClick(event) {
    const activeItems = rawData.value.filter(item => item.despesa > 0);
    const account = activeItems[event.index]; // Use filtered index
    
    if (account) {
        router.push({
            path: '/transactions',
            query: {
                ...props.filters,
                account_id: account.account_id,
                type: 'despesa'
            }
        });
    }
}

watch(() => props.filters, fetchData, { deep: true });
onMounted(fetchData);
</script>

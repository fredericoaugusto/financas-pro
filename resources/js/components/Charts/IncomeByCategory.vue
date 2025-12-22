<template>
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-100 dark:border-gray-700 font-sans">
        <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Receitas por Categoria</h3>
        
        <div v-if="loading" class="h-64 flex items-center justify-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>

        <div v-else-if="!hasData" class="h-64 flex flex-col items-center justify-center text-gray-400">
            <svg class="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>Sem receitas no período</p>
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
    return rawData.value && rawData.value.length > 0;
});

const chartData = computed(() => {
    return {
        labels: rawData.value.map(item => item.name),
        datasets: [{
            data: rawData.value.map(item => item.total),
            backgroundColor: rawData.value.map(item => item.color),
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
        const response = await axios.get('/api/reports/by-category', { 
            params: { ...props.filters, type: 'receita' } 
        });
        rawData.value = response.data.data || [];
    } catch (error) {
        console.error('Error fetching income by category:', error);
        rawData.value = [];
    } finally {
        loading.value = false;
    }
}

function handleClick(event) {
    const category = rawData.value[event.index];
    if (category) {
        router.push({
            path: '/transactions',
            query: {
                ...props.filters,
                category_id: category.category_id,
                type: 'receita'
            }
        });
    }
}

watch(() => props.filters, fetchData, { deep: true });
onMounted(fetchData);
</script>

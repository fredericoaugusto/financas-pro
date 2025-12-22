<template>
    <div class="card h-full flex flex-col">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Despesas por Categoria</h3>
        
        <div v-if="loading" class="flex-1 flex items-center justify-center min-h-[300px]">
            <svg class="animate-spin h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        </div>

        <div v-else-if="!hasData" class="flex-1 flex flex-col items-center justify-center min-h-[300px] text-gray-500">
            <svg class="w-12 h-12 mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
            </svg>
            <p>Sem dados para o período</p>
        </div>

        <div v-else class="flex-1 min-h-[300px]">
            <BaseChart
                type="doughnut"
                :data="chartData"
                :options="chartOptions"
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

const hasData = computed(() => rawData.value.length > 0);

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
    plugins: {
        legend: {
            position: 'right', // Legend on right for doughnut
        }
    }
};

async function fetchData() {
    loading.value = true;
    try {
        const response = await axios.get('/api/reports/by-category', { 
            params: { ...props.filters, type: 'despesa' } 
        });
        rawData.value = response.data.data || [];
    } catch (error) {
        console.error('Error fetching expenses by category:', error);
        rawData.value = [];
    } finally {
        loading.value = false;
    }
}

function handleClick(event) {
    const category = rawData.value[event.index];
    if (category) {
        // Navigate to transactions with filters
        router.push({
            path: '/transactions',
            query: {
                ...props.filters,
                category_id: category.category_id,
                type: 'despesa'
            }
        });
    }
}

watch(() => props.filters, fetchData, { deep: true });

onMounted(fetchData);
</script>

<template>
    <div class="space-y-4">
        <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">Objetivos Financeiros</h3>
        
        <div v-if="loading" class="flex items-center justify-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>

        <div v-else-if="!goals.length" class="text-center py-8 bg-white dark:bg-gray-800 rounded-lg shadow text-gray-400">
            <p>Nenhum objetivo em andamento</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="goal in goals" :key="goal.id" 
                class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-100 dark:border-gray-700 flex flex-col justify-between"
            >
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <h4 class="font-bold text-gray-900 dark:text-white">{{ goal.name }}</h4>
                        <p class="text-xs text-gray-500" v-if="goal.target_date">Meta: {{ formatDate(goal.target_date) }}</p>
                    </div>
                    <div class="w-8 h-8 rounded-full flex items-center justify-center" :style="{ backgroundColor: hexToRgba(goal.color || '#10B981', 0.1) }">
                        <span class="text-lg" :style="{ color: goal.color || '#10B981' }">🎯</span>
                    </div>
                </div>

                <div class="space-y-2">
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-600 dark:text-gray-300">{{ formatCurrency(goal.current) }}</span>
                        <span class="font-medium">{{ goal.percentage }}%</span>
                    </div>
                    
                    <div class="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                        <div class="h-full rounded-full transition-all duration-500"
                            :style="{ width: `${goal.percentage}%`, backgroundColor: goal.color || '#10B981' }"
                        ></div>
                    </div>
                    
                    <p class="text-xs text-right text-gray-400">
                        Faltam {{ formatCurrency(goal.remaining) }}
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const loading = ref(false);
const goals = ref([]);

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

async function fetchData() {
    loading.value = true;
    try {
        const response = await axios.get('/api/reports/goals-progress');
        goals.value = response.data.data || [];
    } catch (error) {
        console.error('Error fetching goals:', error);
        goals.value = [];
    } finally {
        loading.value = false;
    }
}

onMounted(fetchData);
</script>

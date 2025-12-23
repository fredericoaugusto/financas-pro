<template>
    <div class="space-y-6">
        <!-- Header -->
        <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span class="text-2xl">🧠</span> Inteligência Financeira
            </h1>
            <p class="text-gray-500 dark:text-gray-400 mt-1">
                Análise automática dos seus hábitos e saúde financeira
            </p>
        </div>

        <div v-if="loading" class="flex justify-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>

        <div v-else-if="!hasData" class="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <div class="text-4xl mb-4">📊</div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">Ainda analisando seus dados</h3>
            <p class="text-gray-500 mt-2 max-w-md mx-auto">
                Precisamos de mais histórico para gerar insights precisos. Continue registrando suas transações!
            </p>
        </div>

        <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <!-- Left Column: Score & Stability -->
            <div class="lg:col-span-1 space-y-6">
                <!-- Score Card -->
                <div class="card relative overflow-hidden">
                    <div class="absolute top-0 right-0 p-4 opacity-10">
                        <svg class="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.86 0 .92-.81 1.42-2.19 1.42-1.47 0-2.19-.66-2.26-1.63H7.96c.06 1.72 1.14 2.76 2.94 3.09V19h2.38v-1.72c1.69-.34 2.91-1.37 2.91-2.92 0-1.72-1.34-2.65-3.88-3.22z"/></svg>
                    </div>
                    
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Score de Organização</h3>
                    
                    <div class="flex flex-col items-center justify-center py-4">
                        <div class="relative w-32 h-32 flex items-center justify-center">
                            <!-- Circular Progress Background -->
                            <svg class="w-full h-full transform -rotate-90">
                                <circle cx="64" cy="64" r="56" stroke="currentColor" stroke-width="12" fill="transparent" class="text-gray-200 dark:text-gray-700" />
                                <circle cx="64" cy="64" r="56" stroke="currentColor" stroke-width="12" fill="transparent" 
                                    :class="getScoreColorClass(insights.score.total)"
                                    :stroke-dasharray="351.86"
                                    :stroke-dashoffset="351.86 - (351.86 * insights.score.total / 100)"
                                    class="transition-all duration-1000 ease-out"
                                />
                            </svg>
                            <div class="absolute inset-0 flex flex-col items-center justify-center">
                                <span class="text-3xl font-bold text-gray-900 dark:text-white">{{ insights.score.total }}</span>
                            </div>
                        </div>
                        <p class="mt-4 font-medium text-lg" :class="getScoreTextClass(insights.score.total)">
                            {{ insights.score.classification }}
                        </p>
                    </div>

                    <div class="mt-6 space-y-3">
                        <div class="flex justify-between items-center text-sm">
                            <span class="text-gray-500">Estabilidade</span>
                            <span class="font-medium text-gray-700 dark:text-gray-300">{{ insights.score.breakdown.stability }}/30</span>
                        </div>
                        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                            <div class="bg-blue-500 h-1.5 rounded-full" :style="{ width: (insights.score.breakdown.stability / 30 * 100) + '%' }"></div>
                        </div>
                        
                        <div class="flex justify-between items-center text-sm">
                            <span class="text-gray-500">Saldo Positivo</span>
                            <span class="font-medium text-gray-700 dark:text-gray-300">{{ insights.score.breakdown.surplus }}/25</span>
                        </div>
                        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                            <div class="bg-green-500 h-1.5 rounded-full" :style="{ width: (insights.score.breakdown.surplus / 25 * 100) + '%' }"></div>
                        </div>
                    </div>
                </div>

                <!-- Recurring Patterns -->
                <div v-if="insights.patterns.length" class="card">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <span>🔁</span> Padrões de Comportamento
                    </h3>
                    <div class="space-y-4">
                        <div v-for="(pattern, idx) in insights.patterns" :key="idx" 
                             class="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800">
                            <div class="flex items-start gap-3">
                                <div class="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0"
                                     :style="{ backgroundColor: pattern.color || '#6366f1' }">
                                    {{ pattern.icon || '📅' }}
                                </div>
                                <div>
                                    <p class="text-sm text-gray-700 dark:text-gray-200">
                                        {{ pattern.message }}
                                    </p>
                                    <p class="text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-medium">
                                        {{ pattern.count }} vezes nos últimos 2 meses
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Right Column: Trends & Anomalies -->
            <div class="lg:col-span-2 space-y-6">
                
                <!-- Anomalies (Alerts) -->
                <div v-if="insights.anomalies.length" class="card border-l-4 border-red-500">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <span>⚠️</span> Atenção: Gastos Atípicos
                        </h3>
                    </div>
                    <div class="space-y-3">
                        <div v-for="(anomaly, idx) in insights.anomalies" :key="idx" 
                             class="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/10 rounded-lg">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 flex items-center justify-center font-bold">
                                    !
                                </div>
                                <div>
                                    <p class="font-medium text-gray-900 dark:text-white">{{ anomaly.category_name }}</p>
                                    <p class="text-sm text-gray-600 dark:text-gray-400">
                                        {{ anomaly.percentage_above }}% acima da média em {{ formatPeriod(anomaly.month) }}
                                    </p>
                                </div>
                            </div>
                            <div class="text-right">
                                <p class="font-bold text-red-600 dark:text-red-400">{{ formatCurrency(anomaly.value) }}</p>
                                <p class="text-xs text-gray-500">Média: {{ formatCurrency(anomaly.average) }}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Trends Analysis -->
                <div class="card">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <span>📈</span> Tendências por Categoria (3 meses)
                    </h3>
                    
                    <div v-if="insights.trends.length" class="space-y-4">
                        <div v-for="trend in insights.trends" :key="trend.category.id" 
                             class="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors border border-gray-100 dark:border-gray-800">
                            
                            <div class="flex items-center gap-3 flex-1">
                                <div class="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0"
                                     :style="{ backgroundColor: trend.category.color }">
                                    {{ trend.category.icon }}
                                </div>
                                <div>
                                    <p class="font-medium text-gray-900 dark:text-white">{{ trend.category.name }}</p>
                                    <div class="flex items-center gap-2 text-xs">
                                        <span class="text-gray-500">Média anterior: {{ formatCurrency(trend.previous_avg) }}</span>
                                        <span class="text-gray-400">→</span>
                                        <span class="text-gray-900 dark:text-white font-medium">Atual: {{ formatCurrency(trend.current_avg) }}</span>
                                    </div>
                                </div>
                            </div>

                            <div class="flex items-center gap-4 text-right">
                                <div class="flex flex-col items-end">
                                    <span class="text-sm font-bold" :class="getTrendColor(trend.status)">
                                        {{ trend.percentage > 0 ? '+' : ''}}{{ trend.percentage }}%
                                    </span>
                                    <span class="text-xs text-gray-500 uppercase tracking-wide font-medium">
                                        {{ getTrendLabel(trend.status) }}
                                    </span>
                                </div>
                                <div class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-lg">
                                    {{ getTrendIcon(trend.status) }}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div v-else class="text-center py-8 text-gray-500">
                        Nenhuma tendência significativa detectada recentemente.
                    </div>
                </div>

                <!-- Stability Analysis -->
                <div class="card bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900/50">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Estabilidade Financeira</h3>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                            <p class="text-sm text-gray-500 mb-1">Variação Média Mensal</p>
                            <p class="text-2xl font-bold text-gray-900 dark:text-white">
                                {{ insights.stability.avg_variation_pct }}%
                            </p>
                            <p class="text-xs mt-2" :class="insights.stability.avg_variation_pct < 15 ? 'text-green-500' : 'text-yellow-500'">
                                {{ insights.stability.avg_variation_pct < 15 ? '✅ Muito estável' : '⚠️ Variação considerável' }}
                            </p>
                        </div>
                        <div class="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                            <p class="text-sm text-gray-500 mb-1">Meses com Superávit</p>
                            <p class="text-2xl font-bold text-gray-900 dark:text-white">
                                {{ insights.stability.months_with_surplus_pct }}%
                            </p>
                            <p class="text-xs text-gray-500 mt-2">
                                dos últimos 6 meses
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const loading = ref(true);
const hasData = ref(false);
const insights = ref({
    score: { total: 0, classification: '', breakdown: {} },
    trends: [],
    anomalies: [],
    patterns: [],
    stability: {}
});

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatPeriod(periodStr) {
    // YYYY-MM
    const [year, month] = periodStr.split('-');
    const date = new Date(year, month - 1);
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
}

function getScoreColorClass(score) {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-blue-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-red-500';
}

function getScoreTextClass(score) {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-blue-600 dark:text-blue-400';
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
}

function getTrendColor(status) {
    if (status === 'increased') return 'text-red-500'; // Despesa aumentou = ruim
    if (status === 'decreased') return 'text-green-500'; // Despesa caiu = bom
    return 'text-gray-500';
}

function getTrendLabel(status) {
    if (status === 'increased') return 'Aumento';
    if (status === 'decreased') return 'Queda';
    return 'Estável';
}

function getTrendIcon(status) {
    if (status === 'increased') return '📈';
    if (status === 'decreased') return '📉';
    return '➡️';
}

onMounted(async () => {
    try {
        const response = await axios.get('/api/insights/summary');
        insights.value = response.data.data;
        // Simple heuristic to check if we have enough data to show
        hasData.value = insights.value.score.total > 0 || insights.value.trends.length > 0;
    } catch (error) {
        console.error('Error loading insights:', error);
    } finally {
        loading.value = false;
    }
});
</script>

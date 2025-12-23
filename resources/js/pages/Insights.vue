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
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">Ainda aprendendo sobre seus hábitos</h3>
            <p class="text-gray-500 mt-2 max-w-md mx-auto">
                Registre mais alguns meses de transações para receber insights completos e precisos sobre sua vida financeira.
            </p>
        </div>

        <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <!-- Left Column: Score -->
            <div class="lg:col-span-1 space-y-6">
                <!-- Score Card -->
                <div class="card relative overflow-visible">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Score de Organização</h3>
                        <div class="relative group">
                            <span class="cursor-help text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                ℹ️
                            </span>
                            <div class="absolute right-0 w-64 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 invisible group-hover:visible z-50 transition-opacity opacity-0 group-hover:opacity-100 mb-2 bottom-full">
                                <p class="font-semibold mb-2 text-gray-700 dark:text-gray-300">Como calculamos isso?</p>
                                <ul class="list-disc pl-4 space-y-1">
                                    <li>Estabilidade financeira</li>
                                    <li>Frequência de saldo positivo</li>
                                    <li>Controle de orçamento</li>
                                    <li>Baixo número de imprevistos</li>
                                    <li>Existência de objetivos</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    
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

                    <!-- Score Improvement Guidance -->
                    <div class="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Para melhorar seu score:</p>
                        <ul class="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                            <li class="flex items-start gap-2">
                                <span class="text-green-500">•</span>
                                Reduzir variação mensal de gastos
                            </li>
                            <li class="flex items-start gap-2">
                                <span class="text-green-500">•</span>
                                Manter saldo positivo consistentemente
                            </li>
                            <li class="flex items-start gap-2">
                                <span class="text-green-500">•</span>
                                Respeitar os limites de orçamento
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Right Column: Trends, Anomalies, Patterns, Stability -->
            <div class="lg:col-span-2 space-y-6">
                
                <!-- Anomalies (Alerts) -->
                <div v-if="insights.anomalies.length" class="card border-l-4 border-orange-500">
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <span>⚠️</span> Atenção: Gastos Atípicos
                            </h3>
                            <p class="text-xs text-gray-400 mt-1 font-normal">Comparação com a média dos últimos 6 meses</p>
                        </div>
                    </div>
                    <div class="space-y-3">
                        <RouterLink v-for="(anomaly, idx) in insights.anomalies" :key="idx" 
                             to="/transactions"
                             class="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/20 transition-colors group">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 flex items-center justify-center font-bold">
                                    !
                                </div>
                                <div>
                                    <p class="font-medium text-gray-900 dark:text-white group-hover:text-primary-600">{{ anomaly.category_name }}</p>
                                    <p class="text-sm text-gray-600 dark:text-gray-400">
                                        {{ anomaly.percentage_above }}% acima da média em {{ formatPeriod(anomaly.month) }}
                                    </p>
                                </div>
                            </div>
                            <div class="text-right">
                                <p class="font-bold text-orange-600 dark:text-orange-400">{{ formatCurrency(anomaly.value) }}</p>
                                <p class="text-xs text-gray-500">Média: {{ formatCurrency(anomaly.average) }}</p>
                            </div>
                        </RouterLink>
                    </div>
                </div>

                <!-- Trends Analysis -->
                <div class="card">
                    <div class="mb-4">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <span>📈</span> Tendências por Categoria
                        </h3>
                        <p class="text-xs text-gray-400 mt-1 font-normal">Comparado aos 3 meses anteriores</p>
                    </div>
                    
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

                <!-- Recurring Patterns -->
                <div v-if="insights.patterns.length" class="card">
                    <div class="mb-4">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <span>🔁</span> Padrões de Comportamento
                        </h3>
                        <p class="text-xs text-gray-400 mt-1 font-normal">Baseado nos últimos 2 meses</p>
                    </div>
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
import { RouterLink } from 'vue-router';

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
    return 'text-orange-500';
}

function getScoreTextClass(score) {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-blue-600 dark:text-blue-400';
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-orange-600 dark:text-orange-400';
}

function getTrendColor(status) {
    if (status === 'increased') return 'text-orange-500'; // Despesa aumentou = atenção
    if (status === 'decreased') return 'text-green-500'; // Despesa caiu = bom
    return 'text-emerald-600'; // Estável = positivo
}

function getTrendLabel(status) {
    if (status === 'increased') return 'Aumento';
    if (status === 'decreased') return 'Queda';
    return 'Dentro do padrão';
}

function getTrendIcon(status) {
    if (status === 'increased') return '📈';
    if (status === 'decreased') return '📉';
    return '✅';
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

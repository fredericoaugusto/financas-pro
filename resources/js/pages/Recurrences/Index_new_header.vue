<template>
    <div>
        <!-- Page header -->
        <div class="mb-6">
            <div class="flex flex-col gap-4">
                <div>
                    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Recorrências</h1>
                    <p class="text-gray-500 dark:text-gray-400">Gerencie receitas e despesas recorrentes</p>
                </div>
                <div class="flex flex-col sm:flex-row sm:items-center gap-3">
                    <RouterLink to="/recurrences/suggestions" class="btn-secondary w-full sm:w-auto justify-center">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        Sugestões
                    </RouterLink>
                    <button @click="openCreateModal" class="btn-primary w-full sm:w-auto justify-center">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Nova Recorrência
                    </button>
                </div>
            </div>
        </div>

        <!-- Dismissable info banner -->
        <DismissableBanner storage-key="recurrences-info" color="blue">
            Recorrências geram lançamentos automaticamente na data programada.
            Cada lançamento criado pode ser editado ou cancelado independentemente.
        </DismissableBanner>

        <!-- Filter tabs -->
        <div class="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
            <div class="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-full sm:w-auto">
                <button 
                    v-for="tab in tabs" 
                    :key="tab.value"
                    @click="activeTab = tab.value"
                    :class="[
                        'flex-1 sm:flex-none px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap',
                        activeTab === tab.value 
                            ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700'
                    ]"
                >
                    {{ tab.label }}
                    <span class="ml-1 text-xs opacity-60">({{ getTabCount(tab.value) }})</span>
                </button>
            </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex justify-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>

        <!-- Empty state -->
        <div v-else-if="filteredRecurrings.length === 0" class="text-center py-12">
            <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <p class="text-gray-500">Nenhuma recorrência {{ activeTab !== 'all' ? getStatusLabel(activeTab).toLowerCase() : 'cadastrada' }}.</p>
            <button @click="openCreateModal" class="btn-primary mt-4 w-full sm:w-auto">
                Criar primeira recorrência
            </button>
        </div>

        <!-- List -->
        <div v-else class="space-y-3">
            <div 
                v-for="recurring in filteredRecurrings" 
                :key="recurring.id"
                class="card hover:shadow-lg transition-shadow cursor-pointer"
                @click="openDetailModal(recurring)"
            >
                <!-- Card content - stacked layout -->
                <div class="flex flex-col gap-3">
                    <!-- Row 1: Icon + Info -->
                    <div class="flex items-start gap-3">
                        <!-- Icon -->
                        <div :class="[
                            'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                            recurring.type === 'receita' 
                                ? 'bg-green-100 dark:bg-green-900/30' 
                                : 'bg-red-100 dark:bg-red-900/30'
                        ]">
                            <svg v-if="recurring.card_id" class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            <svg v-else :class="[
                                'w-5 h-5',
                                recurring.type === 'receita' ? 'text-green-600' : 'text-red-600'
                            ]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path v-if="recurring.type === 'receita'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12" />
                                <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                            </svg>
                        </div>

                        <!-- Info -->
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 flex-wrap">
                                <p class="text-sm font-semibold text-gray-900 dark:text-white">
                                    {{ recurring.description }}
                                </p>
                                <span :class="getStatusBadgeClass(recurring.status)" class="text-xs">
                                    {{ getStatusLabel(recurring.status) }}
                                </span>
                            </div>
                            <p class="text-xs text-gray-500 mt-0.5">
                                {{ recurring.category?.name || 'Sem categoria' }} · 
                                {{ getFrequencyLabel(recurring) }}
                            </p>
                            <p v-if="recurring.status === 'ativa'" class="text-xs text-primary-600 dark:text-primary-400 mt-0.5 font-medium">
                                Próxima cobrança em {{ formatDate(recurring.next_occurrence) }}
                            </p>
                        </div>
                    </div>

                    <!-- Row 2: Value + Actions -->
                    <div class="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-3">
                        <!-- Value -->
                        <div :class="[
                            recurring.type === 'receita' ? 'text-green-600' : 'text-red-600'
                        ]">
                            <p class="text-lg font-bold">
                                {{ recurring.type === 'receita' ? '+' : '-' }}{{ formatCurrency(recurring.value) }}
                            </p>
                        </div>

                        <!-- Actions -->
                        <div class="flex items-center gap-1" @click.stop>
                            <button 
                                v-if="recurring.status === 'ativa'"
                                @click="openGenerateConfirm(recurring)"
                                class="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                                title="Gerar transação agora"
                            >
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </button>
                            <button 
                                v-if="recurring.status === 'ativa'"
                                @click="openPauseConfirm(recurring)"
                                class="p-2 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg"
                                title="Pausar"
                            >
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </button>
                            <button 
                                v-if="recurring.status === 'pausada'"
                                @click="resumeRecurring(recurring)"
                                class="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                                title="Retomar"
                            >
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </button>
                            <button 
                                @click="openEditModal(recurring)"
                                class="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                title="Editar"
                            >
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>
                            <button 
                                v-if="recurring.status !== 'encerrada'"
                                @click="openEndConfirm(recurring)"
                                class="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                title="Encerrar"
                            >
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

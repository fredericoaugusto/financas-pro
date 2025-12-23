<template>
    <div>
        <div class="mb-6">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Backup & Restauração</h1>
            <p class="text-gray-500 dark:text-gray-400">Exporte seus dados ou restaure a partir de um backup</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Export Section -->
            <div class="card p-6">
                <div class="flex items-center gap-3 mb-4">
                    <div class="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <svg class="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </div>
                    <div>
                        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Exportar Backup</h2>
                        <p class="text-sm text-gray-500">Baixe todos os seus dados</p>
                    </div>
                </div>

                <div class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4">
                    <p class="text-sm text-gray-600 dark:text-gray-300">
                        O backup inclui todas as suas <strong>contas, cartões, categorias, lançamentos, recorrências, orçamentos e metas</strong>.
                    </p>
                    <p class="text-sm text-gray-500 mt-2">
                        Guarde o arquivo em local seguro. Você pode usá-lo para restaurar seus dados a qualquer momento.
                    </p>
                </div>

                <button
                    @click="exportBackup"
                    :disabled="exporting"
                    class="w-full btn-primary flex items-center justify-center gap-2"
                >
                    <svg v-if="exporting" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    {{ exporting ? 'Gerando backup...' : 'Exportar Backup' }}
                </button>
            </div>

            <!-- Restore Section -->
            <div class="card p-6">
                <div class="flex items-center gap-3 mb-4">
                    <div class="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                        <svg class="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                    </div>
                    <div>
                        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Restaurar Backup</h2>
                        <p class="text-sm text-gray-500">Importe dados de um arquivo</p>
                    </div>
                </div>

                <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                    <div class="flex gap-2">
                        <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p class="text-sm text-red-700 dark:text-red-300">
                            <strong>Atenção:</strong> A restauração irá <strong>substituir todos os seus dados atuais</strong>. Esta ação não pode ser desfeita.
                        </p>
                    </div>
                </div>

                <!-- File Upload -->
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Arquivo de Backup (.json)
                    </label>
                    <input
                        type="file"
                        accept=".json,application/json"
                        @change="handleFileSelect"
                        class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-primary-900/30 dark:file:text-primary-400"
                    />
                </div>

                <!-- Preview -->
                <div v-if="preview" class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4">
                    <h3 class="font-medium text-gray-900 dark:text-white mb-3">Resumo do Backup</h3>
                    <div class="grid grid-cols-2 gap-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-500">Contas:</span>
                            <span class="font-medium text-gray-900 dark:text-white">{{ preview.counts.accounts }}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-500">Cartões:</span>
                            <span class="font-medium text-gray-900 dark:text-white">{{ preview.counts.cards }}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-500">Categorias:</span>
                            <span class="font-medium text-gray-900 dark:text-white">{{ preview.counts.categories }}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-500">Lançamentos:</span>
                            <span class="font-medium text-gray-900 dark:text-white">{{ preview.counts.transactions }}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-500">Recorrências:</span>
                            <span class="font-medium text-gray-900 dark:text-white">{{ preview.counts.recurring_transactions }}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-500">Orçamentos:</span>
                            <span class="font-medium text-gray-900 dark:text-white">{{ preview.counts.budgets }}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-500">Metas:</span>
                            <span class="font-medium text-gray-900 dark:text-white">{{ preview.counts.goals }}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-500">Faturas:</span>
                            <span class="font-medium text-gray-900 dark:text-white">{{ preview.counts.invoices }}</span>
                        </div>
                    </div>
                    <p class="text-xs text-gray-400 mt-3">
                        Versão: {{ preview.backup_version }} • Gerado em: {{ formatDate(preview.generated_at) }}
                    </p>
                </div>

                <!-- Error -->
                <div v-if="error" class="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 mb-4">
                    <p class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
                </div>

                <button
                    @click="showConfirmModal = true"
                    :disabled="!preview || restoring"
                    class="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    <svg v-if="restoring" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {{ restoring ? 'Restaurando...' : 'Restaurar Backup' }}
                </button>
            </div>
        </div>

        <!-- Confirm Modal -->
        <Teleport to="body">
            <div v-if="showConfirmModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div class="fixed inset-0 bg-black/50" @click="showConfirmModal = false"></div>
                <div class="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
                    <div class="text-center mb-6">
                        <div class="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                            <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Confirmar Restauração</h3>
                        <p class="text-gray-500 dark:text-gray-400">
                            Todos os seus dados atuais serão <strong class="text-red-600">permanentemente excluídos</strong> e substituídos pelos dados do backup.
                        </p>
                    </div>

                    <div class="flex gap-3">
                        <button
                            @click="showConfirmModal = false"
                            class="flex-1 btn-secondary"
                        >
                            Cancelar
                        </button>
                        <button
                            @click="restoreBackup"
                            class="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
                        >
                            Sim, Restaurar
                        </button>
                    </div>
                </div>
            </div>
        </Teleport>

        <!-- Success Modal -->
        <Teleport to="body">
            <div v-if="showSuccessModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div class="fixed inset-0 bg-black/50"></div>
                <div class="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 text-center">
                    <div class="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                        <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Backup Restaurado!</h3>
                    <p class="text-gray-500 dark:text-gray-400 mb-6">
                        Seus dados foram restaurados com sucesso.
                    </p>
                    <button
                        @click="showSuccessModal = false; $router.push('/dashboard')"
                        class="btn-primary"
                    >
                        Ir para o Dashboard
                    </button>
                </div>
            </div>
        </Teleport>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';

const exporting = ref(false);
const restoring = ref(false);
const selectedFile = ref(null);
const preview = ref(null);
const error = ref(null);
const showConfirmModal = ref(false);
const showSuccessModal = ref(false);

async function exportBackup() {
    exporting.value = true;
    try {
        const response = await axios.get('/api/backup/export', {
            responseType: 'blob'
        });
        
        const filename = `financaspro_backup_${new Date().toISOString().slice(0, 10)}.json`;
        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    } catch (err) {
        console.error('Export error:', err);
        alert('Erro ao exportar backup');
    } finally {
        exporting.value = false;
    }
}

async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    selectedFile.value = file;
    preview.value = null;
    error.value = null;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await axios.post('/api/backup/preview', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.data.valid) {
            preview.value = response.data.preview;
        } else {
            error.value = response.data.errors?.join(', ') || 'Arquivo inválido';
        }
    } catch (err) {
        error.value = err.response?.data?.errors?.join(', ') || 'Erro ao validar arquivo';
    }
}

async function restoreBackup() {
    if (!selectedFile.value) return;

    showConfirmModal.value = false;
    restoring.value = true;

    const formData = new FormData();
    formData.append('file', selectedFile.value);
    formData.append('confirm', '1');

    try {
        const response = await axios.post('/api/backup/import', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.data.success) {
            showSuccessModal.value = true;
        } else {
            error.value = response.data.message;
        }
    } catch (err) {
        error.value = err.response?.data?.message || 'Erro ao restaurar backup';
    } finally {
        restoring.value = false;
    }
}

function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pt-BR');
}
</script>

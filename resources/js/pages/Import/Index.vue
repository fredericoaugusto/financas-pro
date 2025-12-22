<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">📤 Importar Extrato</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">Importe seu extrato bancário no formato OFX/QFX</p>
      </div>
      <button v-if="importStore.transactions.length > 0" @click="reset" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition">
        ← Nova Importação
      </button>
    </div>

    <!-- Upload Zone -->
    <div v-if="importStore.transactions.length === 0 && !importStore.loading" class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center transition-colors duration-200" :class="{ 'border-blue-500 bg-blue-50 dark:bg-blue-900/20': isDragging }" @dragover.prevent="isDragging = true" @dragleave.prevent="isDragging = false" @drop.prevent="handleDrop">
      <div class="flex flex-col items-center">
        <svg class="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
        </svg>
        <p class="text-lg text-gray-600 dark:text-gray-300 mb-2">Arraste seu arquivo OFX aqui</p>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">ou</p>
        <label class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition">
          Selecionar Arquivo
          <input type="file" accept=".ofx,.qfx" class="hidden" @change="handleFileSelect" />
        </label>
        <p class="text-xs text-gray-400 dark:text-gray-500 mt-4">Formatos: OFX, QFX (máx. 10MB)</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="importStore.loading" class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span class="ml-3 text-gray-600 dark:text-gray-300">Processando arquivo...</span>
    </div>

    <!-- Error -->
    <div v-if="importStore.error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <div class="flex">
        <span class="text-red-500">⚠️</span>
        <p class="ml-2 text-red-700 dark:text-red-400">{{ importStore.error }}</p>
      </div>
    </div>

    <!-- Results -->
    <template v-if="importStore.transactions.length > 0 && !importStore.loading">
      <!-- Account Bar -->
      <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div class="flex items-center gap-2">
            <span class="text-blue-600 dark:text-blue-400">🏦</span>
            <span class="text-blue-700 dark:text-blue-300 font-medium">Conta de destino:</span>
          </div>
          <select :value="defaultAccountId" @change="handleDefaultAccountChange" class="bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-600 rounded-lg px-4 py-2 text-sm dark:text-white">
            <option value="">Selecione uma conta</option>
            <option v-for="acc in importStore.accounts" :key="acc.id" :value="acc.id">{{ acc.name }} {{ acc.bank ? `(${acc.bank})` : '' }}</option>
          </select>
          <button @click="applyDefaultAccount" class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition">Aplicar a selecionados</button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm"><p class="text-sm text-gray-500 dark:text-gray-400">Total</p><p class="text-2xl font-bold text-gray-900 dark:text-white">{{ importStore.stats?.total || 0 }}</p></div>
        <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4"><p class="text-sm text-green-600 dark:text-green-400">Novos</p><p class="text-2xl font-bold text-green-600 dark:text-green-400">{{ importStore.stats?.new || 0 }}</p></div>
        <div class="bg-red-50 dark:bg-red-900/20 rounded-lg p-4"><p class="text-sm text-red-600 dark:text-red-400">Duplicados</p><p class="text-2xl font-bold text-red-600 dark:text-red-400">{{ importStore.stats?.duplicate || 0 }}</p></div>
        <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4"><p class="text-sm text-blue-600 dark:text-blue-400">Transferências</p><p class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ importStore.stats?.transfer || 0 }}</p></div>
        <div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4"><p class="text-sm text-purple-600 dark:text-purple-400">Selecionados</p><p class="text-2xl font-bold text-purple-600 dark:text-purple-400">{{ importStore.selectedCount }}</p></div>
      </div>

      <!-- Legend -->
      <div class="flex flex-wrap gap-4 text-sm">
        <span class="flex items-center"><span class="w-3 h-3 rounded-full bg-green-500 mr-2"></span>Novo</span>
        <span class="flex items-center"><span class="w-3 h-3 rounded-full bg-red-500 mr-2"></span>Duplicado</span>
        <span class="flex items-center"><span class="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>Transferência</span>
      </div>

      <!-- Actions -->
      <div class="flex flex-wrap items-center justify-between gap-4 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <div class="flex gap-2 flex-wrap">
          <button @click="importStore.selectAll()" class="px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition">Selecionar Todos</button>
          <button @click="importStore.selectNew()" class="px-3 py-1.5 text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded hover:bg-green-200 transition">Selecionar Novos</button>
          <button @click="importStore.selectNone()" class="px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition">Limpar</button>
        </div>
        <div class="text-sm text-gray-600 dark:text-gray-300">
          <span class="text-green-600 dark:text-green-400 font-medium">+{{ formatCurrency(importStore.totalSelectedIncome) }}</span>
          <span class="mx-2">|</span>
          <span class="text-red-600 dark:text-red-400 font-medium">-{{ formatCurrency(importStore.totalSelectedExpense) }}</span>
        </div>
      </div>

      <!-- Table -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th class="w-10 px-2 py-3 text-left"><input type="checkbox" :checked="importStore.selectedCount === importStore.transactions.length" @change="toggleAllSelection" class="rounded" /></th>
                <th class="w-12 px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">St</th>
                <th class="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Data</th>
                <th class="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Descrição</th>
                <th class="px-2 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Valor</th>
                <th class="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tipo</th>
                <th class="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Pgto</th>
                <th class="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Categoria</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-for="(item, index) in importStore.transactions" :key="index" :class="getRowClass(item)" class="transition-colors">
                <td class="px-2 py-2"><input type="checkbox" :checked="importStore.selectedIds.has(index)" @change="importStore.toggleSelection(index)" class="rounded" /></td>
                <td class="px-2 py-2"><span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium" :class="getStatusBadgeClass(item.ui_status)">{{ getStatusIcon(item.ui_status) }}</span></td>
                <td class="px-2 py-2 text-sm text-gray-900 dark:text-white whitespace-nowrap">{{ formatDate(item.original.date) }}</td>
                <td class="px-2 py-2 max-w-xs">
                  <div class="text-sm text-gray-900 dark:text-white truncate" :title="item.original.original_description">{{ item.original.description }}</div>
                  <div v-if="item.transfer_match_index !== null" class="text-xs text-blue-600 dark:text-blue-400">🔗 Transf #{{ item.transfer_match_index + 1 }}</div>
                </td>
                <td class="px-2 py-2 text-right whitespace-nowrap">
                  <span class="font-medium text-sm" :class="item.original.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">{{ formatCurrency(item.original.amount) }}</span>
                </td>
                <td class="px-2 py-2">
                  <select :value="item.suggested_type" @change="importStore.updateType(index, $event.target.value)" class="text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 dark:text-white w-20">
                    <option value="receita">Receita</option>
                    <option value="despesa">Despesa</option>
                    <option value="transferencia">Transf</option>
                  </select>
                </td>
                <td class="px-2 py-2">
                  <select :value="item.suggested_payment_method || ''" @change="importStore.updatePaymentMethod(index, $event.target.value)" class="text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 dark:text-white w-20">
                    <option value="">-</option>
                    <option v-for="(label, key) in importStore.paymentMethods" :key="key" :value="key">{{ label }}</option>
                  </select>
                </td>
                <td class="px-2 py-2">
                  <select :value="item.suggested_category_id || ''" @change="importStore.updateCategoryId(index, $event.target.value)" class="text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 dark:text-white w-28">
                    <option value="">-</option>
                    <option v-for="cat in getCategoriesForType(item.suggested_type)" :key="cat.id" :value="cat.id">{{ cat.icon }} {{ cat.name }}</option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Import Buttons -->
      <div class="flex justify-end gap-4">
        <button @click="confirmImport('pendente')" :disabled="importStore.selectedCount === 0 || importStore.loading" class="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium">Importar Pendente ({{ importStore.selectedCount }})</button>
        <button @click="confirmImport('confirmada')" :disabled="importStore.selectedCount === 0 || importStore.loading" class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium">Importar Confirmado ({{ importStore.selectedCount }})</button>
      </div>
    </template>

    <!-- Success Modal -->
    <div v-if="showSuccessModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="closeSuccessModal">
      <div class="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl text-center">
        <div class="text-5xl mb-4">✅</div>
        <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Importação Concluída!</h3>
        <p class="text-gray-600 dark:text-gray-300 mb-4">{{ successMessage }}</p>
        <button @click="closeSuccessModal" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">Fechar</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useImportStore } from '@/stores/import';

const router = useRouter();
const importStore = useImportStore();

const isDragging = ref(false);
const showSuccessModal = ref(false);
const successMessage = ref('');
const defaultAccountId = ref('');

const handleDrop = (e) => { isDragging.value = false; const file = e.dataTransfer.files[0]; if (file) processFile(file); };
const handleFileSelect = (e) => { const file = e.target.files[0]; if (file) processFile(file); };

const processFile = async (file) => {
  try {
    await importStore.uploadFile(file);
    if (importStore.transactions.length > 0) {
      defaultAccountId.value = importStore.transactions[0].suggested_account_id || '';
    }
  } catch (err) { console.error('Error:', err); }
};

const handleDefaultAccountChange = (e) => { defaultAccountId.value = e.target.value; };
const applyDefaultAccount = () => { importStore.bulkUpdateAccount(defaultAccountId.value); };

const confirmImport = async (status) => {
  try {
    const result = await importStore.confirmImport(status, defaultAccountId.value);
    successMessage.value = `${result.imported} transações importadas!`;
    if (result.skipped > 0) successMessage.value += ` ${result.skipped} duplicadas ignoradas.`;
    showSuccessModal.value = true;
  } catch (err) { console.error('Error:', err); }
};

const closeSuccessModal = () => { showSuccessModal.value = false; router.push('/transactions'); };
const reset = () => { importStore.reset(); defaultAccountId.value = ''; };
const toggleAllSelection = () => { importStore.selectedCount === importStore.transactions.length ? importStore.selectNone() : importStore.selectAll(); };

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(value));
const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('pt-BR');

const getRowClass = (item) => ({ green: 'bg-green-50/50 dark:bg-green-900/10', red: 'bg-red-50/50 dark:bg-red-900/10 opacity-60', yellow: 'bg-yellow-50/50 dark:bg-yellow-900/10', blue: 'bg-blue-50/50 dark:bg-blue-900/10' }[item.ui_status] || '');
const getStatusBadgeClass = (uiStatus) => ({ green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400', red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400', yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400', blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' }[uiStatus] || '');
const getStatusIcon = (uiStatus) => ({ green: '🟢', red: '🔴', yellow: '🟡', blue: '🔵' }[uiStatus] || '');

// Filter categories by transaction type
const getCategoriesForType = (type) => {
  if (!type || type === 'transferencia') {
    return importStore.categories;
  }
  // Type already matches: despesa/receita
  return importStore.categories.filter(cat => cat.type === type || !cat.type);
};
</script>

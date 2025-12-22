import { defineStore } from 'pinia';
import axios from 'axios';

export const useImportStore = defineStore('import', {
    state: () => ({
        loading: false,
        error: null,
        accountInfo: null,
        transactions: [],
        stats: null,
        categories: [],
        selectedIds: new Set(),
    }),

    getters: {
        selectedTransactions: (state) => {
            return state.transactions.filter((_, index) => state.selectedIds.has(index));
        },

        selectedCount: (state) => {
            return state.selectedIds.size;
        },

        newTransactions: (state) => {
            return state.transactions.filter(t => t.technical_status === 'new');
        },

        duplicateTransactions: (state) => {
            return state.transactions.filter(t => t.technical_status === 'duplicate');
        },

        totalSelectedIncome: (state) => {
            let total = 0;
            state.transactions.forEach((t, index) => {
                if (state.selectedIds.has(index) && t.original.amount > 0) {
                    total += t.original.amount;
                }
            });
            return total;
        },

        totalSelectedExpense: (state) => {
            let total = 0;
            state.transactions.forEach((t, index) => {
                if (state.selectedIds.has(index) && t.original.amount < 0) {
                    total += Math.abs(t.original.amount);
                }
            });
            return total;
        },
    },

    actions: {
        async uploadFile(file) {
            this.loading = true;
            this.error = null;

            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await axios.post('/api/import/parse', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });

                this.accountInfo = response.data.account_info;
                this.transactions = response.data.transactions;
                this.stats = response.data.stats;
                this.categories = response.data.categories;

                // Pre-select new transactions
                this.selectedIds = new Set();
                this.transactions.forEach((t, index) => {
                    if (t.selected) {
                        this.selectedIds.add(index);
                    }
                });

                return response.data;
            } catch (err) {
                this.error = err.response?.data?.message || 'Erro ao processar arquivo';
                throw err;
            } finally {
                this.loading = false;
            }
        },

        async confirmImport(status = 'confirmada') {
            if (this.selectedIds.size === 0) {
                throw new Error('Nenhuma transação selecionada');
            }

            this.loading = true;
            this.error = null;

            const transactionsToImport = this.selectedTransactions.map(t => ({
                date: t.original.date,
                description: t.original.description,
                amount: t.original.amount,
                type: t.original.type,
                category: t.suggested_category,
                account_id: t.account_id || null,
                hash: t.original.hash,
                hash_version: t.original.hash_version,
                status: status,
            }));

            try {
                const response = await axios.post('/api/import/confirm', {
                    transactions: transactionsToImport,
                });

                // Clear state after successful import
                this.reset();

                return response.data;
            } catch (err) {
                this.error = err.response?.data?.message || 'Erro ao importar transações';
                throw err;
            } finally {
                this.loading = false;
            }
        },

        toggleSelection(index) {
            if (this.selectedIds.has(index)) {
                this.selectedIds.delete(index);
            } else {
                this.selectedIds.add(index);
            }
            // Trigger reactivity
            this.selectedIds = new Set(this.selectedIds);
        },

        selectAll() {
            this.selectedIds = new Set(this.transactions.map((_, i) => i));
        },

        selectNone() {
            this.selectedIds = new Set();
        },

        selectNew() {
            this.selectedIds = new Set();
            this.transactions.forEach((t, index) => {
                if (t.technical_status === 'new') {
                    this.selectedIds.add(index);
                }
            });
        },

        updateCategory(index, category) {
            if (this.transactions[index]) {
                this.transactions[index].suggested_category = category;
            }
        },

        updateAccountId(index, accountId) {
            if (this.transactions[index]) {
                this.transactions[index].account_id = accountId;
            }
        },

        reset() {
            this.accountInfo = null;
            this.transactions = [];
            this.stats = null;
            this.categories = [];
            this.selectedIds = new Set();
            this.error = null;
        },
    },
});

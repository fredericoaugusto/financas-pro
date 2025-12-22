import { defineStore } from 'pinia';
import axios from 'axios';

export const useImportStore = defineStore('import', {
    state: () => ({
        loading: false,
        error: null,
        accountInfo: null,
        transactions: [],
        stats: null,

        // Options for dropdowns
        categories: [],
        paymentMethods: {},
        accounts: [],
        cards: [],

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
                    headers: { 'Content-Type': 'multipart/form-data' },
                });

                this.accountInfo = response.data.account_info;
                this.transactions = response.data.transactions;
                this.stats = response.data.stats;
                this.categories = response.data.categories || [];
                this.paymentMethods = response.data.payment_methods || {};
                this.accounts = response.data.accounts || [];
                this.cards = response.data.cards || [];

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

        async confirmImport(status = 'confirmada', defaultAccountId = null) {
            if (this.selectedIds.size === 0) {
                throw new Error('Nenhuma transação selecionada');
            }

            // Validate that we have an account
            if (!defaultAccountId) {
                this.error = 'Selecione uma conta de destino antes de importar';
                throw new Error('Selecione uma conta de destino antes de importar');
            }

            this.loading = true;
            this.error = null;

            const transactionsToImport = this.selectedTransactions.map(t => ({
                date: t.original.date,
                description: t.original.description,
                amount: t.original.amount,
                type: t.suggested_type || t.original.type,
                category_id: t.suggested_category_id || null,
                account_id: t.suggested_account_id || null, // Can be null, backend will use default
                card_id: t.suggested_card_id || null,
                payment_method: t.suggested_payment_method || null,
                hash: t.original.hash,
                hash_version: t.original.hash_version,
                status: status,
            }));

            try {
                const response = await axios.post('/api/import/confirm', {
                    default_account_id: parseInt(defaultAccountId),
                    transactions: transactionsToImport,
                });

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

        updateCategoryId(index, categoryId) {
            if (this.transactions[index]) {
                this.transactions[index].suggested_category_id = categoryId ? parseInt(categoryId) : null;
            }
        },

        updateAccount(index, accountId) {
            if (this.transactions[index]) {
                this.transactions[index].suggested_account_id = accountId ? parseInt(accountId) : null;
            }
        },

        updateCard(index, cardId) {
            if (this.transactions[index]) {
                this.transactions[index].suggested_card_id = cardId ? parseInt(cardId) : null;
            }
        },

        updatePaymentMethod(index, method) {
            if (this.transactions[index]) {
                this.transactions[index].suggested_payment_method = method || null;
            }
        },

        updateType(index, type) {
            if (this.transactions[index]) {
                this.transactions[index].suggested_type = type;
            }
        },

        bulkUpdateAccount(accountId) {
            this.selectedIds.forEach(index => {
                if (this.transactions[index]) {
                    this.transactions[index].suggested_account_id = accountId ? parseInt(accountId) : null;
                }
            });
        },

        bulkUpdateCategoryId(categoryId) {
            this.selectedIds.forEach(index => {
                if (this.transactions[index]) {
                    this.transactions[index].suggested_category_id = categoryId ? parseInt(categoryId) : null;
                }
            });
        },

        reset() {
            this.accountInfo = null;
            this.transactions = [];
            this.stats = null;
            this.categories = [];
            this.paymentMethods = {};
            this.accounts = [];
            this.cards = [];
            this.selectedIds = new Set();
            this.error = null;
        },
    },
});

import { defineStore } from 'pinia';
import axios from 'axios';
import { useUiStore } from './ui';

export const useGoalsStore = defineStore('goals', {
    state: () => ({
        goals: [],
        loading: false,
    }),

    getters: {
        activeGoals: (state) => state.goals.filter(g => g.status === 'em_andamento'),
        completedGoals: (state) => state.goals.filter(g => g.status === 'concluido'),
        cancelledGoals: (state) => state.goals.filter(g => g.status === 'cancelado'),
    },

    actions: {
        async fetchGoals(status = null) {
            this.loading = true;
            try {
                const params = status ? { status } : {};
                const response = await axios.get('/api/goals', { params });
                this.goals = response.data.data;
            } catch (error) {
                const uiStore = useUiStore();
                uiStore.showToast('Erro ao carregar objetivos', 'error');
            } finally {
                this.loading = false;
            }
        },

        async createGoal(data) {
            const uiStore = useUiStore();
            try {
                const response = await axios.post('/api/goals', data);
                this.goals.unshift(response.data.data);
                uiStore.showToast(response.data.message, 'success');
                return response.data.data;
            } catch (error) {
                const message = error.response?.data?.message || 'Erro ao criar objetivo';
                uiStore.showToast(message, 'error');
                throw error;
            }
        },

        async updateGoal(id, data) {
            const uiStore = useUiStore();
            try {
                const response = await axios.put(`/api/goals/${id}`, data);
                const index = this.goals.findIndex(g => g.id === id);
                if (index !== -1) {
                    this.goals[index] = response.data.data;
                }
                uiStore.showToast(response.data.message, 'success');
                return response.data.data;
            } catch (error) {
                const message = error.response?.data?.message || 'Erro ao atualizar objetivo';
                uiStore.showToast(message, 'error');
                throw error;
            }
        },

        async deleteGoal(id) {
            const uiStore = useUiStore();
            try {
                await axios.delete(`/api/goals/${id}`);
                this.goals = this.goals.filter(g => g.id !== id);
                uiStore.showToast('Objetivo removido!', 'success');
            } catch (error) {
                const message = error.response?.data?.message || 'Erro ao remover objetivo';
                uiStore.showToast(message, 'error');
                throw error;
            }
        },

        async deposit(id, amount) {
            const uiStore = useUiStore();
            try {
                const response = await axios.post(`/api/goals/${id}/deposit`, { amount });
                const index = this.goals.findIndex(g => g.id === id);
                if (index !== -1) {
                    this.goals[index] = response.data.data;
                }
                uiStore.showToast(response.data.message, 'success');
                return response.data.data;
            } catch (error) {
                const message = error.response?.data?.message || 'Erro ao depositar';
                uiStore.showToast(message, 'error');
                throw error;
            }
        },

        async withdraw(id, amount) {
            const uiStore = useUiStore();
            try {
                const response = await axios.post(`/api/goals/${id}/withdraw`, { amount });
                const index = this.goals.findIndex(g => g.id === id);
                if (index !== -1) {
                    this.goals[index] = response.data.data;
                }
                uiStore.showToast(response.data.message, 'success');
                return response.data.data;
            } catch (error) {
                const message = error.response?.data?.message || 'Erro ao sacar';
                uiStore.showToast(message, 'error');
                throw error;
            }
        },

        async cancel(id) {
            const uiStore = useUiStore();
            try {
                const response = await axios.post(`/api/goals/${id}/cancel`);
                const index = this.goals.findIndex(g => g.id === id);
                if (index !== -1) {
                    this.goals[index] = response.data.data;
                }
                uiStore.showToast(response.data.message, 'success');
                return response.data.data;
            } catch (error) {
                const message = error.response?.data?.message || 'Erro ao cancelar';
                uiStore.showToast(message, 'error');
                throw error;
            }
        },

        async reactivate(id) {
            const uiStore = useUiStore();
            try {
                const response = await axios.post(`/api/goals/${id}/reactivate`);
                const index = this.goals.findIndex(g => g.id === id);
                if (index !== -1) {
                    this.goals[index] = response.data.data;
                }
                uiStore.showToast(response.data.message, 'success');
                return response.data.data;
            } catch (error) {
                const message = error.response?.data?.message || 'Erro ao reativar';
                uiStore.showToast(message, 'error');
                throw error;
            }
        },
    },
});

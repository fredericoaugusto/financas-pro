<?php

namespace App\Observers;

use App\Models\GeneralBudget;
use App\Models\Transaction;
use App\Services\GeneralBudgetService;

/**
 * Observer para verificar orçamentos gerais quando transações são criadas/atualizadas.
 * 
 * NOTA: Este observer usa o novo schema de general_budgets com periods.
 * Os alertas são gerenciados através de GeneralBudgetPeriod, não diretamente no budget.
 */
class GeneralBudgetObserver
{
    public function __construct(
        private GeneralBudgetService $budgetService
    ) {
    }

    /**
     * Check general budget thresholds when a transaction is created.
     */
    public function checkBudgets(Transaction $transaction): void
    {
        // Only check for expenses
        if ($transaction->type !== 'despesa') {
            return;
        }

        $userId = $transaction->user_id;

        // Check monthly budget (active status only)
        $monthlyBudget = GeneralBudget::where('user_id', $userId)
            ->where('period_type', 'monthly')
            ->where('status', 'active')
            ->first();

        if ($monthlyBudget) {
            $this->budgetService->recalculateCurrentPeriod($monthlyBudget);
        }

        // Check annual budget (active status only)
        $annualBudget = GeneralBudget::where('user_id', $userId)
            ->where('period_type', 'yearly')
            ->where('status', 'active')
            ->first();

        if ($annualBudget) {
            $this->budgetService->recalculateCurrentPeriod($annualBudget);
        }
    }
}

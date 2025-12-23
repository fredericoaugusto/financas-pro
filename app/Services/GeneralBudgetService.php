<?php

namespace App\Services;

use App\Models\GeneralBudget;
use App\Models\GeneralBudgetPeriod;
use App\Models\Notification;

class GeneralBudgetService
{
    public function __construct(
        private NotificationService $notificationService
    ) {
    }

    /**
     * Ensure a period exists for the given budget and month/year.
     */
    public function ensurePeriodExists(GeneralBudget $budget, int $year, ?int $month = null): GeneralBudgetPeriod
    {
        $period = $budget->periods()
            ->where('reference_year', $year)
            ->where('reference_month', $month)
            ->first();

        if (!$period) {
            $period = $budget->periods()->create([
                'reference_year' => $year,
                'reference_month' => $month,
                'limit_value_snapshot' => $budget->limit_value,
                'spent' => 0,
                'status' => 'ok',
            ]);
        }

        return $period;
    }

    /**
     * Recalculate and check thresholds for the current period.
     */
    public function recalculateCurrentPeriod(GeneralBudget $budget): void
    {
        if (!$budget->isActive()) {
            return;
        }

        $period = $budget->ensureCurrentPeriod();
        $period->recalculateSpent();
        $this->checkThresholds($period);
    }

    /**
     * Check budget thresholds and send notifications.
     */
    public function checkThresholds(GeneralBudgetPeriod $period): void
    {
        $percentage = $period->percentage;
        $budget = $period->generalBudget;
        $periodLabel = $period->getPeriodLabel();

        // 100% threshold
        if ($percentage >= 100 && !$period->alert_100_sent) {
            $this->notificationService->create(
                $budget->user_id,
                Notification::TYPE_BUDGET_EXCEEDED,
                'Orçamento Geral estourado',
                "Seu orçamento geral de {$periodLabel} foi excedido.",
                [
                    'general_budget_id' => $budget->id,
                    'period_id' => $period->id,
                    'percentage' => round($percentage),
                    'spent' => $period->spent,
                    'limit' => $period->limit_value_snapshot,
                ]
            );
            $period->alert_100_sent = true;
            $period->save();
        }
        // 80% threshold
        elseif ($percentage >= 80 && !$period->alert_80_sent) {
            $this->notificationService->create(
                $budget->user_id,
                Notification::TYPE_BUDGET_WARNING,
                'Orçamento Geral em risco',
                "Atenção: você já utilizou " . round($percentage) . "% do orçamento geral de {$periodLabel}.",
                [
                    'general_budget_id' => $budget->id,
                    'period_id' => $period->id,
                    'percentage' => round($percentage),
                    'spent' => $period->spent,
                    'limit' => $period->limit_value_snapshot,
                ]
            );
            $period->alert_80_sent = true;
            $period->save();
        }
    }

    /**
     * Generate periods for all active budgets for the current month.
     */
    public function generateCurrentPeriods(): array
    {
        $now = now();
        $year = $now->year;
        $month = $now->month;
        $generated = [];

        $budgets = GeneralBudget::where('status', 'active')->get();

        foreach ($budgets as $budget) {
            $periodMonth = $budget->period_type === 'monthly' ? $month : null;

            $existing = $budget->periods()
                ->where('reference_year', $year)
                ->where('reference_month', $periodMonth)
                ->exists();

            if (!$existing) {
                $period = $this->ensurePeriodExists($budget, $year, $periodMonth);
                $period->recalculateSpent();
                $this->checkThresholds($period);
                $generated[] = $period;
            }
        }

        return $generated;
    }
}

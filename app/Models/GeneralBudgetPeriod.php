<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GeneralBudgetPeriod extends Model
{
    protected $fillable = [
        'general_budget_id',
        'reference_year',
        'reference_month',
        'limit_value_snapshot',
        'spent',
        'status',
        'alert_80_sent',
        'alert_100_sent',
    ];

    protected $casts = [
        'limit_value_snapshot' => 'decimal:2',
        'spent' => 'decimal:2',
        'alert_80_sent' => 'boolean',
        'alert_100_sent' => 'boolean',
    ];

    protected $appends = ['percentage'];

    public function generalBudget(): BelongsTo
    {
        return $this->belongsTo(GeneralBudget::class);
    }

    /**
     * Get the spending percentage.
     */
    public function getPercentageAttribute(): float
    {
        if ($this->limit_value_snapshot <= 0)
            return 0;
        return min(($this->spent / $this->limit_value_snapshot) * 100, 150);
    }

    /**
     * Recalculate spent amount from transactions.
     */
    public function recalculateSpent(): void
    {
        $budget = $this->generalBudget;

        $query = Transaction::where('user_id', $budget->user_id)
            ->where('type', 'despesa');

        // Date filter
        if ($this->reference_month) {
            // Monthly
            $startDate = sprintf('%04d-%02d-01', $this->reference_year, $this->reference_month);
            $lastDay = date('t', strtotime($startDate));
            $endDate = sprintf('%04d-%02d-%02d', $this->reference_year, $this->reference_month, $lastDay);
            $query->whereBetween('date', [$startDate, $endDate]);
        } else {
            // Yearly
            $query->whereYear('date', $this->reference_year);
        }

        // Category filter
        if (!$budget->include_future_categories && !empty($budget->category_ids)) {
            $query->whereIn('category_id', $budget->category_ids);
        }

        $this->spent = (float) $query->sum('value');
        $this->updateStatus();
        $this->save();
    }

    /**
     * Update status based on percentage.
     */
    public function updateStatus(): void
    {
        $percentage = $this->percentage;
        if ($percentage >= 100) {
            $this->status = 'exceeded';
        } elseif ($percentage >= 80) {
            $this->status = 'warning';
        } else {
            $this->status = 'ok';
        }
    }

    /**
     * Get period label.
     */
    public function getPeriodLabel(): string
    {
        $months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        if ($this->reference_month) {
            return $months[$this->reference_month - 1] . '/' . $this->reference_year;
        }
        return (string) $this->reference_year;
    }
}

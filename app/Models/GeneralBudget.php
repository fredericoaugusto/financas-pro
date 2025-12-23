<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GeneralBudget extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'limit_value',
        'period_type',
        'start_date',
        'status',
        'category_ids',
        'include_future_categories',
    ];

    protected $casts = [
        'limit_value' => 'decimal:2',
        'start_date' => 'date',
        'category_ids' => 'array',
        'include_future_categories' => 'boolean',
    ];

    protected $appends = ['current_period'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function periods(): HasMany
    {
        return $this->hasMany(GeneralBudgetPeriod::class);
    }

    /**
     * Get the current period (or create if not exists).
     */
    public function getCurrentPeriodAttribute(): ?GeneralBudgetPeriod
    {
        $now = now();
        $year = $now->year;
        $month = $this->period_type === 'monthly' ? $now->month : null;

        return $this->periods()
            ->where('reference_year', $year)
            ->where('reference_month', $month)
            ->first();
    }

    /**
     * Ensure the current period exists.
     */
    public function ensureCurrentPeriod(): GeneralBudgetPeriod
    {
        if ($this->status !== 'active') {
            return $this->currentPeriod ?? new GeneralBudgetPeriod();
        }

        $now = now();
        $year = $now->year;
        $month = $this->period_type === 'monthly' ? $now->month : null;

        $period = $this->periods()
            ->where('reference_year', $year)
            ->where('reference_month', $month)
            ->first();

        if (!$period) {
            $period = $this->periods()->create([
                'reference_year' => $year,
                'reference_month' => $month,
                'limit_value_snapshot' => $this->limit_value,
                'spent' => 0,
                'status' => 'ok',
            ]);
            $period->recalculateSpent();
        }

        return $period;
    }

    /**
     * Check if budget is active.
     */
    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    /**
     * Pause the budget.
     */
    public function pause(): void
    {
        $this->status = 'paused';
        $this->save();
    }

    /**
     * Resume the budget.
     */
    public function resume(): void
    {
        $this->status = 'active';
        $this->save();
        $this->ensureCurrentPeriod();
    }

    /**
     * End the budget permanently.
     */
    public function end(): void
    {
        $this->status = 'ended';
        $this->save();
    }
}

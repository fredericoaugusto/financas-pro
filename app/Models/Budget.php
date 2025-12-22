<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

/**
 * Budget - Orçamento por categoria e mês/ano
 * 
 * REGRA: Apenas informa e alerta, NUNCA bloqueia gastos
 */
class Budget extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'category_id',
        'reference_month',
        'period_type', // 'mensal' ou 'anual'
        'limit_value',
    ];

    protected $casts = [
        'limit_value' => 'decimal:2',
    ];

    protected $appends = [
        'consumed_value',
        'remaining_value',
        'usage_percentage',
        'status',
    ];

    // Relationships
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    // Helper attributes

    /**
     * Valor consumido: soma das despesas da categoria no período (mês ou ano)
     */
    public function getConsumedValueAttribute(): float
    {
        $periodType = $this->period_type ?? 'mensal';

        if ($periodType === 'anual') {
            // Orçamento anual: reference_month contém apenas o ano (YYYY)
            $year = (int) $this->reference_month;
            $startDate = Carbon::create($year, 1, 1)->startOfYear();
            $endDate = $startDate->copy()->endOfYear();
        } else {
            // Orçamento mensal: reference_month é YYYY-MM
            $parts = explode('-', $this->reference_month);
            $year = (int) $parts[0];
            $month = (int) ($parts[1] ?? 1);

            $startDate = Carbon::create($year, $month, 1)->startOfMonth();
            $endDate = $startDate->copy()->endOfMonth();
        }

        return Transaction::where('user_id', $this->user_id)
            ->where('category_id', $this->category_id)
            ->where('type', 'despesa')
            ->whereBetween('date', [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')])
            ->sum('value');
    }

    /**
     * Valor restante no orçamento
     */
    public function getRemainingValueAttribute(): float
    {
        $remaining = $this->limit_value - $this->consumed_value;
        return $remaining; // Pode ser negativo para mostrar quanto excedeu
    }

    /**
     * Percentual de uso do orçamento
     */
    public function getUsagePercentageAttribute(): float
    {
        if ($this->limit_value <= 0) {
            return 0;
        }

        $percentage = ($this->consumed_value / $this->limit_value) * 100;
        return round($percentage, 1);
    }

    /**
     * Status do orçamento
     * - ok: < 80%
     * - warning: >= 80% e < 100%
     * - exceeded: >= 100%
     */
    public function getStatusAttribute(): string
    {
        $percentage = $this->usage_percentage;

        if ($percentage >= 100) {
            return 'exceeded';
        }

        if ($percentage >= 80) {
            return 'warning';
        }

        return 'ok';
    }

    // Scopes

    public function scopeForPeriod($query, string $period, string $type = 'mensal')
    {
        return $query->where('reference_month', $period)
            ->where('period_type', $type);
    }

    public function scopeForMonth($query, string $month)
    {
        return $query->where('reference_month', $month)
            ->where('period_type', 'mensal');
    }

    public function scopeForYear($query, string $year)
    {
        return $query->where('reference_month', $year)
            ->where('period_type', 'anual');
    }

    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }
}

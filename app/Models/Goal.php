<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Goal - Objetivo financeiro
 * 
 * REGRA: NÃO afeta saldo real, é apenas controle interno
 */
class Goal extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'description',
        'icon',
        'color',
        'target_value',
        'current_value',
        'status',
        'target_date',
    ];

    protected $casts = [
        'target_value' => 'decimal:2',
        'current_value' => 'decimal:2',
        'target_date' => 'date',
    ];

    protected $appends = [
        'progress_percentage',
        'remaining_value',
        'is_completed',
    ];

    // Relationships
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // Helper attributes

    /**
     * Percentual de progresso
     */
    public function getProgressPercentageAttribute(): float
    {
        if ($this->target_value <= 0) {
            return 0;
        }

        $percentage = ($this->current_value / $this->target_value) * 100;
        return min(100, round($percentage, 1));
    }

    /**
     * Valor restante para atingir a meta
     */
    public function getRemainingValueAttribute(): float
    {
        return max(0, $this->target_value - $this->current_value);
    }

    /**
     * Verifica se o objetivo foi concluído
     */
    public function getIsCompletedAttribute(): bool
    {
        return $this->current_value >= $this->target_value || $this->status === 'concluido';
    }

    // Actions

    /**
     * Deposita valor no objetivo (controle interno, NÃO cria transação)
     */
    public function deposit(float $amount): void
    {
        $this->current_value += $amount;

        // Auto-completar quando atingir a meta
        if ($this->current_value >= $this->target_value && $this->status === 'em_andamento') {
            $this->status = 'concluido';
        }

        $this->save();
    }

    /**
     * Saca valor do objetivo (controle interno, NÃO cria transação)
     */
    public function withdraw(float $amount): void
    {
        $this->current_value = max(0, $this->current_value - $amount);

        // Se estava concluído e sacou, volta para em_andamento
        if ($this->status === 'concluido' && $this->current_value < $this->target_value) {
            $this->status = 'em_andamento';
        }

        $this->save();
    }

    // Scopes

    public function scopeActive($query)
    {
        return $query->where('status', 'em_andamento');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'concluido');
    }

    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }
}

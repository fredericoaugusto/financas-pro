<?php

namespace App\Services;

use App\Models\Transaction;
use App\Models\RecurringTransaction;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SubscriptionDetectionService
{
    /**
     * Configurações de detecção
     */
    private const MIN_OCCURRENCES = 3;
    private const VALUE_TOLERANCE = 0.10; // 10%
    private const INTERVAL_TOLERANCE_DAYS = 5;

    /**
     * Detecta possíveis assinaturas a partir do histórico de transações
     */
    public function detectPotentialSubscriptions(int $userId): Collection
    {
        // 1. Agrupar transações por descrição normalizada
        $transactions = Transaction::where('user_id', $userId)
            ->where('type', 'despesa')
            ->whereNotIn('status', ['estornada', 'cancelada'])
            ->where('date', '>=', now()->subMonths(6))
            ->orderBy('date', 'asc')
            ->get();

        $grouped = $this->groupByNormalizedDescription($transactions);

        // 2. Analisar cada grupo
        $suggestions = collect();

        foreach ($grouped as $key => $group) {
            if ($group->count() < self::MIN_OCCURRENCES) {
                continue;
            }

            $analysis = $this->analyzeGroup($group);

            if ($analysis && $analysis['confidence'] >= 0.5) {
                // Verificar se já existe recorrência para essa descrição
                $existingRecurring = RecurringTransaction::where('user_id', $userId)
                    ->where('status', '!=', 'encerrada')
                    ->whereRaw('LOWER(description) LIKE ?', ['%' . strtolower($analysis['description_pattern']) . '%'])
                    ->exists();

                if (!$existingRecurring) {
                    $suggestions->push($analysis);
                }
            }
        }

        return $suggestions->sortByDesc('confidence')->values();
    }

    /**
     * Agrupa transações por descrição normalizada
     */
    private function groupByNormalizedDescription(Collection $transactions): Collection
    {
        return $transactions->groupBy(function ($tx) {
            return $this->normalizeDescription($tx->description);
        });
    }

    /**
     * Normaliza descrição para comparação
     */
    private function normalizeDescription(string $description): string
    {
        // Remove números, datas, referências
        $normalized = preg_replace('/\d{2}\/\d{2}\/?\d{0,4}/', '', $description);
        $normalized = preg_replace('/\d+/', '', $normalized);
        $normalized = preg_replace('/\s+/', ' ', $normalized);
        $normalized = Str::lower(trim($normalized));

        // Remove sufixos comuns de parcelas
        $normalized = preg_replace('/\s*(parcela|parc|pgt|pgto|ref|fatura).*$/i', '', $normalized);

        return $normalized;
    }

    /**
     * Analisa um grupo de transações para detectar padrão de recorrência
     */
    private function analyzeGroup(Collection $transactions): ?array
    {
        if ($transactions->count() < self::MIN_OCCURRENCES) {
            return null;
        }

        // Ordenar por data
        $sorted = $transactions->sortBy('date')->values();

        // Calcular intervalos entre transações
        $intervals = [];
        for ($i = 1; $i < $sorted->count(); $i++) {
            $prev = Carbon::parse($sorted[$i - 1]->date);
            $curr = Carbon::parse($sorted[$i]->date);
            $intervals[] = $prev->diffInDays($curr);
        }

        if (empty($intervals)) {
            return null;
        }

        // Calcular intervalo médio
        $avgInterval = array_sum($intervals) / count($intervals);

        // Determinar frequência
        $frequency = $this->determineFrequency($avgInterval);
        if (!$frequency) {
            return null;
        }

        // Verificar consistência do intervalo
        $intervalVariance = $this->calculateVariance($intervals, $avgInterval);
        $intervalConsistency = max(0, 1 - ($intervalVariance / (self::INTERVAL_TOLERANCE_DAYS * self::INTERVAL_TOLERANCE_DAYS)));

        // Calcular valor médio e consistência
        $values = $sorted->pluck('value')->map(fn($v) => floatval($v))->toArray();
        $avgValue = array_sum($values) / count($values);
        $valueVariance = $this->calculateVariance($values, $avgValue);
        $valueRelativeVariance = $avgValue > 0 ? $valueVariance / ($avgValue * $avgValue) : 1;
        $valueConsistency = max(0, 1 - ($valueRelativeVariance / (self::VALUE_TOLERANCE * self::VALUE_TOLERANCE)));

        // Calcular score de confiança
        $confidence = ($intervalConsistency * 0.5) + ($valueConsistency * 0.3) + (min($sorted->count(), 6) / 6 * 0.2);

        // Encontrar descrição padrão (a mais comum)
        $descriptions = $sorted->pluck('description')->countBy();
        $mostCommonDescription = $descriptions->keys()->first();

        // Última ocorrência
        $lastOccurrence = $sorted->last()->date;

        // Detectar mudança de valor recente
        $valueChange = null;
        if ($sorted->count() >= 2) {
            $lastValue = floatval($sorted->last()->value);
            $previousValue = floatval($sorted->get($sorted->count() - 2)->value);

            if (abs($lastValue - $previousValue) / max($previousValue, 0.01) > 0.05) {
                $valueChange = [
                    'from' => $previousValue,
                    'to' => $lastValue,
                    'change_percent' => round((($lastValue - $previousValue) / $previousValue) * 100, 1)
                ];
            }
        }

        return [
            'description' => $mostCommonDescription,
            'description_pattern' => $this->normalizeDescription($mostCommonDescription),
            'amount_avg' => round($avgValue, 2),
            'amount_last' => floatval($sorted->last()->value),
            'interval' => $frequency['name'],
            'interval_days' => round($avgInterval),
            'frequency' => $frequency['code'],
            'frequency_value' => $frequency['value'],
            'confidence' => round($confidence, 2),
            'occurrences' => $sorted->count(),
            'last_occurrence' => $lastOccurrence instanceof Carbon ? $lastOccurrence->format('Y-m-d') : $lastOccurrence,
            'value_change' => $valueChange,
            'category_id' => $sorted->last()->category_id,
            'account_id' => $sorted->last()->account_id,
            'card_id' => $sorted->last()->card_id,
            'payment_method' => $sorted->last()->payment_method,
        ];
    }

    /**
     * Determina a frequência baseado no intervalo médio
     */
    private function determineFrequency(float $avgDays): ?array
    {
        if ($avgDays >= 5 && $avgDays <= 9) {
            return ['code' => 'semanal', 'name' => 'Semanal', 'value' => 1];
        }
        if ($avgDays >= 12 && $avgDays <= 16) {
            return ['code' => 'semanal', 'name' => 'Quinzenal', 'value' => 2];
        }
        if ($avgDays >= 25 && $avgDays <= 35) {
            return ['code' => 'mensal', 'name' => 'Mensal', 'value' => 1];
        }
        if ($avgDays >= 55 && $avgDays <= 65) {
            return ['code' => 'mensal', 'name' => 'Bimestral', 'value' => 2];
        }
        if ($avgDays >= 85 && $avgDays <= 100) {
            return ['code' => 'mensal', 'name' => 'Trimestral', 'value' => 3];
        }
        if ($avgDays >= 170 && $avgDays <= 200) {
            return ['code' => 'mensal', 'name' => 'Semestral', 'value' => 6];
        }
        if ($avgDays >= 350 && $avgDays <= 380) {
            return ['code' => 'anual', 'name' => 'Anual', 'value' => 1];
        }

        return null;
    }

    /**
     * Calcula variância de um conjunto de valores
     */
    private function calculateVariance(array $values, float $mean): float
    {
        if (count($values) <= 1) {
            return 0;
        }

        $sumSquares = 0;
        foreach ($values as $value) {
            $sumSquares += pow($value - $mean, 2);
        }

        return $sumSquares / count($values);
    }

    /**
     * Cria uma recorrência a partir de uma sugestão aceita
     */
    public function createRecurringFromSuggestion(int $userId, array $suggestion): RecurringTransaction
    {
        // Calcular próxima ocorrência baseado no intervalo
        $lastOccurrence = Carbon::parse($suggestion['last_occurrence']);
        $nextOccurrence = $this->calculateNextOccurrence($lastOccurrence, $suggestion['frequency'], $suggestion['frequency_value']);

        return RecurringTransaction::create([
            'user_id' => $userId,
            'description' => $suggestion['description'],
            'value' => $suggestion['amount_last'] ?? $suggestion['amount_avg'],
            'type' => 'despesa',
            'frequency' => $suggestion['frequency'],
            'frequency_value' => $suggestion['frequency_value'],
            'start_date' => $suggestion['last_occurrence'],
            'next_occurrence' => $nextOccurrence,
            'status' => 'ativa',
            'category_id' => $suggestion['category_id'] ?? null,
            'account_id' => $suggestion['account_id'] ?? null,
            'card_id' => $suggestion['card_id'] ?? null,
            'payment_method' => $suggestion['payment_method'] ?? 'dinheiro',
            'notes' => 'Criada automaticamente a partir de detecção inteligente.',
        ]);
    }

    /**
     * Calcula próxima ocorrência
     */
    private function calculateNextOccurrence(Carbon $lastDate, string $frequency, int $value): Carbon
    {
        $next = $lastDate->copy();

        switch ($frequency) {
            case 'semanal':
                return $next->addWeeks($value);
            case 'mensal':
                return $next->addMonths($value);
            case 'anual':
                return $next->addYears($value);
            default:
                return $next->addMonth();
        }
    }
}

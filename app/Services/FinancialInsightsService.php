<?php

namespace App\Services;

use App\Models\Transaction;
use App\Models\Category;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class FinancialInsightsService
{
    /**
     * Get a summary of all insights.
     */
    public function getSummary()
    {
        $score = $this->calculateScore();
        $trends = $this->analyzeTrends();
        $anomalies = $this->detectAnomalies();
        $patterns = $this->detectBehavioralPatterns();
        $stability = $this->calculateStability();

        return [
            'score' => $score,
            'trends' => $trends,
            'anomalies' => $anomalies,
            'patterns' => $patterns,
            'stability' => $stability,
        ];
    }

    /**
     * 1. Análise de Tendência por Categoria
     * Compara média dos últimos 3 meses vs 3 meses anteriores.
     */
    public function analyzeTrends()
    {
        $userId = Auth::id();
        $now = Carbon::now();

        // Período Atual: últimos 3 meses (últimos 90 dias)
        // Período Anterior: 3 meses antes disso (90-180 dias atrás)
        $currentStart = $now->copy()->subDays(90);
        $previousStart = $now->copy()->subDays(180);
        $previousEnd = $now->copy()->subDays(90);

        // Fetch all recent transactions and group in PHP to avoid PostgreSQL GROUP BY issues
        $currentTransactions = Transaction::with('account')
            ->where('user_id', $userId)
            ->where('type', 'despesa')
            ->where('date', '>=', $currentStart)
            ->whereNotIn('status', ['estornada', 'cancelada'])
            ->get()
            ->filter(function ($t) {
                // Filter: include if no account or account not excluded
                return !$t->account || !$t->account->exclude_from_totals;
            });

        $previousTransactions = Transaction::with('account')
            ->where('user_id', $userId)
            ->where('type', 'despesa')
            ->whereBetween('date', [$previousStart, $previousEnd])
            ->whereNotIn('status', ['estornada', 'cancelada'])
            ->get()
            ->filter(function ($t) {
                return !$t->account || !$t->account->exclude_from_totals;
            });

        // Group by category in PHP
        $currentData = $currentTransactions->groupBy('category_id')->map(function ($txs) {
            return $txs->sum('value');
        });

        $previousData = $previousTransactions->groupBy('category_id')->map(function ($txs) {
            return $txs->sum('value');
        });

        $trends = [];
        $categoryIds = $currentData->keys()
            ->merge($previousData->keys())
            ->unique()
            ->filter(function ($id) {
                return !empty($id);
            })
            ->values();

        $categories = Category::whereIn('id', $categoryIds)->get()->keyBy('id');

        foreach ($categoryIds as $catId) {
            $category = $categories->get($catId);
            if (!$category)
                continue;

            $currTotal = $currentData->get($catId, 0);
            $prevTotal = $previousData->get($catId, 0);

            $currAvg = $currTotal / 3;
            $prevAvg = $prevTotal / 3;

            if ($prevAvg == 0) {
                $status = 'stable';
                $percent = 0;
            } else {
                $percent = (($currAvg - $prevAvg) / $prevAvg) * 100;
                if ($percent >= 20) {
                    $status = 'increased';
                } elseif ($percent <= -20) {
                    $status = 'decreased';
                } else {
                    $status = 'stable';
                }
            }

            if ($currAvg > 0 || $prevAvg > 0) {
                $trends[] = [
                    'category' => $category,
                    'current_avg' => round($currAvg, 2),
                    'previous_avg' => round($prevAvg, 2),
                    'percentage' => round($percent, 1),
                    'status' => $status,
                ];
            }
        }

        return collect($trends)->sortByDesc(function ($item) {
            return abs($item['percentage']);
        })->values();
    }

    /**
     * 2. Detecção de Aumento Anormal de Gastos
     * Identificar meses onde gasto > média + 50% (150% da média) nos últimos 6 meses.
     */
    public function detectAnomalies()
    {
        $userId = Auth::id();
        $start = Carbon::now()->subMonths(6)->startOfMonth();

        // Vamos buscar tudo e agrupar no PHP para segurança e compatibilidade de banco.
        $transactions = Transaction::with(['category', 'account'])
            ->where('user_id', $userId)
            // ->includedInTotals() // Removido para evitar erro de SQL no Postgres
            ->where('type', 'despesa')
            ->where('date', '>=', $start)
            ->whereNotIn('status', ['estornada', 'cancelada'])
            ->get()
            ->filter(function ($t) {
                return !$t->account || !$t->account->exclude_from_totals;
            });

        $grouped = $transactions->groupBy(function ($t) {
            return $t->category_id . '|' . Carbon::parse($t->date)->format('Y-m');
        });

        $monthlyData = [];
        $categoryAvgs = [];

        // Calcular totais mensais
        foreach ($grouped as $key => $txs) {
            [$catId, $month] = explode('|', $key);
            $total = $txs->sum('value');
            $monthlyData[$catId][$month] = $total;
            $categoryName[$catId] = $txs->first()->category->name ?? 'Outros'; // Cache name
        }

        $anomalies = [];

        foreach ($monthlyData as $catId => $months) {
            // Calcular média dos 6 meses
            // Preencher com 0 os meses vazios se necessário? Para anomalia de "pico", média dos meses COM dados ou TODO o período?
            // "Média dos últimos 6 meses" geralmente implica soma total / 6.

            $totalSum = array_sum($months);
            $avg = $totalSum / 6; // Divisor fixo 6 meses do período

            if ($avg < 10)
                continue; // Ignorar categorias com gastos muito baixos

            foreach ($months as $month => $value) {
                // Regra: > 150% da média
                if ($value > ($avg * 1.5)) {
                    $anomalies[] = [
                        'category_id' => $catId,
                        'category_name' => $categoryName[$catId] ?? 'Categoria',
                        'month' => $month,
                        'value' => $value,
                        'average' => $avg,
                        'percentage_above' => round((($value - $avg) / $avg) * 100),
                        'message' => "Gasto atípico em " . ($categoryName[$catId] ?? 'Categoria') . ": R$ " . number_format($value, 2, ',', '.') . " em " . Carbon::createFromFormat('Y-m', $month)->format('M/Y') . " (Média: R$ " . number_format($avg, 2, ',', '.') . ")"
                    ];
                }
            }
        }

        // Retornar ordenado pelos mais recentes e maiores desvios
        return collect($anomalies)->sortByDesc('month')->values();
    }

    /**
     * 3. Insights de Recorrência Comportamental
     * Agrupar por Categoria e Dia da Semana. Frequência >= 3 em 2 meses.
     */
    public function detectBehavioralPatterns()
    {
        $userId = Auth::id();
        $start = Carbon::now()->subMonths(2);

        $transactions = Transaction::with(['category', 'account'])
            ->where('user_id', $userId)
            // ->includedInTotals()
            ->where('type', 'despesa')
            ->where('date', '>=', $start)
            ->whereNotIn('status', ['estornada', 'cancelada'])
            ->get()
            ->filter(function ($t) {
                return !$t->account || !$t->account->exclude_from_totals;
            });

        $patterns = [];
        $weekdayCounts = [];

        foreach ($transactions as $tx) {
            if (!$tx->category)
                continue;

            $weekday = Carbon::parse($tx->date)->locale('pt_BR')->dayName; // segunda-feira, etc
            $key = $tx->category->name . '|' . $weekday;

            if (!isset($weekdayCounts[$key])) {
                $weekdayCounts[$key] = [
                    'count' => 0,
                    'total_value' => 0,
                    'category' => $tx->category->name,
                    'weekday' => $weekday,
                    'icon' => $tx->category->icon,
                    'color' => $tx->category->color
                ];
            }

            $weekdayCounts[$key]['count']++;
            $weekdayCounts[$key]['total_value'] += $tx->value;
        }

        foreach ($weekdayCounts as $data) {
            if ($data['count'] >= 3) {
                $avgValue = $data['total_value'] / $data['count'];
                $patterns[] = [
                    'type' => 'weekday_recurrence',
                    'category' => $data['category'],
                    'weekday' => ucfirst($data['weekday']),
                    'count' => $data['count'],
                    'average_value' => $avgValue,
                    'icon' => $data['icon'],
                    'color' => $data['color'],
                    'message' => "Você costuma gastar com {$data['category']} às {$data['weekday']}s (Média: R$ " . number_format($avgValue, 2, ',', '.') . ")"
                ];
            }
        }

        return array_values($patterns);
    }

    /**
     * 4. Análise de Estabilidade Financeira
     * Variação mensal de despesas nos últimos 4-6 meses.
     */
    public function calculateStability()
    {
        $userId = Auth::id();
        $start = Carbon::now()->subMonths(6)->startOfMonth();

        $monthlyStats = Transaction::with('account')
            ->where('user_id', $userId)
            // ->includedInTotals()
            ->where('date', '>=', $start)
            ->whereNotIn('status', ['estornada', 'cancelada'])
            ->get()
            ->filter(function ($t) {
                return !$t->account || !$t->account->exclude_from_totals;
            })
            ->groupBy(function ($t) {
                return Carbon::parse($t->date)->format('Y-m');
            })
            ->map(function ($txs) {
                return [
                    'income' => $txs->where('type', 'receita')->sum('value'),
                    'expense' => $txs->where('type', 'despesa')->sum('value'),
                ];
            })
            ->sortKeys();

        if ($monthlyStats->count() < 2) {
            return [
                'status' => 'insufficient_data',
                'message' => 'Dados insuficientes para análise de estabilidade.',
                'variations' => [],
                'score_component' => 50 // Neutro
            ];
        }

        $variations = [];
        $previousExpense = null;
        $instabilityCount = 0;
        $monthsWithSurplus = 0;

        foreach ($monthlyStats as $month => $stat) {
            if ($stat['income'] >= $stat['expense']) {
                $monthsWithSurplus++;
            }

            if ($previousExpense !== null && $previousExpense > 0) {
                $variation = abs($stat['expense'] - $previousExpense) / $previousExpense;
                $variations[] = $variation;
                if ($variation > 0.35) { // > 35% variação
                    $instabilityCount++;
                }
            } elseif ($previousExpense === 0 && $stat['expense'] > 0) {
                $variations[] = 1.0; // 100% variação se saiu de 0
                $instabilityCount++;
            }
            $previousExpense = $stat['expense'];
        }

        $avgVariation = count($variations) > 0 ? array_sum($variations) / count($variations) : 0;

        $status = 'high_stability';
        if ($avgVariation > 0.30)
            $status = 'low_stability';
        elseif ($avgVariation > 0.15)
            $status = 'medium_stability';

        return [
            'status' => $status,
            'avg_variation_pct' => round($avgVariation * 100, 1),
            'months_with_surplus_pct' => round(($monthsWithSurplus / $monthlyStats->count()) * 100),
            'monthly_data' => $monthlyStats,
        ];
    }

    /**
     * 5. Score Financeiro Simples (0-100)
     */
    public function calculateScore()
    {
        // 1. Estabilidade (30pts)
        $stability = $this->calculateStability();
        $stabilityScore = 0;

        if ($stability['status'] !== 'insufficient_data') {
            // Menor variação = Maior nota
            // 0% variação = 30 pts
            // 50% variação = 0 pts
            $variationScore = max(0, 30 - ($stability['avg_variation_pct'] * 0.6)); // Ajuste simples
            $stabilityScore = $variationScore;
        } else {
            $stabilityScore = 15; // Pontuação média se sem dados
        }

        // 2. Meses com saldo positivo (25pts)
        $surplusScore = 0;
        if (isset($stability['months_with_surplus_pct'])) {
            $surplusScore = ($stability['months_with_surplus_pct'] / 100) * 25;
        }

        // 3. Uso de Orçamento (20pts)
        // Verificar se estourou orçamentos recentemente
        // Como não temos acesso fácil a histórico de orçamento aqui sem query complexa, 
        // vamos simplificar: se despesa total < receita total nos ultimos 3 meses = bom uso?
        // Ou verificar orçamentos ativos 'within'.
        // Vamos usar a regra do "Meses com saldo positivo" como proxy parcial, mas melhor
        // verificar GeneralBudgets.
        $budgetScore = 20;
        // TODO: refinar com histórico real de orçamentos se possível.
        // Por hora, penalizar se detectamos muitas anomalias recentes.

        // 4. Anomalias (10pts) - Baixo número de picos = bom
        $anomalies = $this->detectAnomalies();
        $recentAnomalies = collect($anomalies)->where('month', '>=', Carbon::now()->subMonths(3)->format('Y-m'))->count();
        $anomaliesScore = max(0, 10 - ($recentAnomalies * 2)); // -2 pontos por anomalia recente

        // 5. Reserva/Meta (15pts)
        // Verificar se tem Objetivos (Goals) em progresso
        $hasGoals = \App\Models\Goal::where('user_id', Auth::id())
            ->where('status', 'em_andamento')
            ->exists();
        $goalsScore = $hasGoals ? 15 : 5;

        $totalScore = round($stabilityScore + $surplusScore + $budgetScore + $anomaliesScore + $goalsScore);
        $totalScore = min(100, max(0, $totalScore));

        $classification = 'Risco';
        if ($totalScore >= 80)
            $classification = 'Excelente';
        elseif ($totalScore >= 60)
            $classification = 'Bom';
        elseif ($totalScore >= 40)
            $classification = 'Atenção';

        return [
            'total' => $totalScore,
            'classification' => $classification,
            'breakdown' => [
                'stability' => round($stabilityScore),
                'surplus' => round($surplusScore),
                'budget' => round($budgetScore),
                'goals' => round($goalsScore),
                'anomalies' => round($anomaliesScore),
            ]
        ];
    }
}

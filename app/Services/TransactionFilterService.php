<?php

namespace App\Services;

use App\Models\Transaction;
use App\Support\DatabaseDateHelper;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

/**
 * TransactionFilterService
 * 
 * Serviço reutilizável para aplicar filtros padronizados em queries de transações.
 * Usado por: TransactionController, ReportController, ChartController
 */
class TransactionFilterService
{
    /**
     * Parâmetros de filtro padronizados
     */
    public const FILTER_PARAMS = [
        'date_from',      // Data inicial (YYYY-MM-DD)
        'date_to',        // Data final (YYYY-MM-DD)
        'category_id',    // ID da categoria
        'account_id',     // ID da conta
        'card_id',        // ID do cartão
        'type',           // receita, despesa, transferencia
        'status',         // pendente, paga, agendada, estornada, cancelada
        'search',         // Busca por descrição
        'payment_methods', // Array de métodos de pagamento
        'is_recurring',   // Booleano/String: 'true' (fixo), 'false' (variável)
        'is_installment', // Booleano/String: 'true' (parcelado), 'false' (à vista)
        'min_value',      // Valor mínimo
        'max_value',      // Valor máximo
    ];

    /**
     * Aplica filtros a uma query de transações
     * 
     * @param Builder $query Query base
     * @param array $filters Filtros a aplicar
     * @return Builder Query com filtros aplicados
     */
    public function apply(Builder $query, array $filters): Builder
    {
        // Filtro por tipo
        if (!empty($filters['type'])) {
            $query->where('type', $filters['type']);
        }

        // Filtro por categoria
        if (!empty($filters['category_id'])) {
            $query->where('category_id', $filters['category_id']);
        }

        // Filtro por conta (inclui from_account_id para transferências)
        if (!empty($filters['account_id'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('account_id', $filters['account_id'])
                    ->orWhere('from_account_id', $filters['account_id']);
            });
        }

        // Filtro por cartão
        if (!empty($filters['card_id'])) {
            $query->where('card_id', $filters['card_id']);
        }

        // Filtro por data inicial
        if (!empty($filters['date_from'])) {
            $query->whereDate('date', '>=', $filters['date_from']);
        }

        // Filtro por data final
        if (!empty($filters['date_to'])) {
            $query->whereDate('date', '<=', $filters['date_to']);
        }

        // Filtro por status
        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        // Busca por descrição (case-insensitive para compatibilidade com Postgres)
        if (!empty($filters['search'])) {
            $query->whereRaw(
                'LOWER(description) LIKE ?',
                ['%' . strtolower($filters['search']) . '%']
            );
        }

        // Filtro por método de pagamento (suporta array ou string única)
        if (!empty($filters['payment_methods'])) {
            $methods = is_array($filters['payment_methods']) ? $filters['payment_methods'] : [$filters['payment_methods']];
            $query->whereIn('payment_method', $methods);
        }

        // Filtro por Recorrência (Fixo vs Variável)
        // Definido: Fixo = com recurring_transaction_id, Variável = sem
        if (isset($filters['is_recurring']) && $filters['is_recurring'] !== '') {
            $isRecurring = filter_var($filters['is_recurring'], FILTER_VALIDATE_BOOLEAN);
            if ($isRecurring) {
                $query->whereNotNull('recurring_transaction_id');
            } else {
                $query->whereNull('recurring_transaction_id');
            }
        }

        // Filtro por Parcelamento
        if (isset($filters['is_installment']) && $filters['is_installment'] !== '') {
            $isInstallment = filter_var($filters['is_installment'], FILTER_VALIDATE_BOOLEAN);
            if ($isInstallment) {
                $query->where('total_installments', '>', 1);
            } else {
                $query->where(function ($q) {
                    $q->where('total_installments', 1)
                        ->orWhereNull('total_installments');
                });
            }
        }

        // Filtro por Faixa de Valor
        if (!empty($filters['min_value'])) {
            $query->where('value', '>=', $filters['min_value']);
        }
        if (!empty($filters['max_value'])) {
            $query->where('value', '<=', $filters['max_value']);
        }

        return $query;
    }

    /**
     * Obtém transações filtradas com relacionamentos
     */
    public function getFiltered(int $userId, array $filters, array $with = []): Builder
    {
        $query = Transaction::where('user_id', $userId);

        if (!empty($with)) {
            $query->with($with);
        }

        return $this->apply($query, $filters);
    }

    /**
     * Obtém agregações (totais) para o período filtrado
     * 
     * @return array ['receita' => X, 'despesa' => Y, 'saldo' => Z]
     */
    public function getAggregations(int $userId, array $filters): array
    {
        $query = Transaction::where('user_id', $userId)
            ->whereNotIn('status', ['estornada', 'cancelada']);

        $query = $this->apply($query, $filters);

        $receita = (clone $query)->where('type', 'receita')->sum('value');
        $despesa = (clone $query)->where('type', 'despesa')->sum('value');

        return [
            'receita' => (float) $receita,
            'despesa' => (float) $despesa,
            'saldo' => (float) ($receita - $despesa),
        ];
    }

    /**
     * Agrupa despesas por categoria
     * 
     * @return array [['category_id' => X, 'name' => Y, 'total' => Z, 'color' => W], ...]
     */
    public function getByCategory(int $userId, array $filters): array
    {
        $query = Transaction::where('user_id', $userId)
            ->whereNotIn('status', ['estornada', 'cancelada'])
            ->whereNotNull('category_id');

        $query = $this->apply($query, $filters);

        return $query->selectRaw('category_id, SUM(value) as total')
            ->groupBy('category_id')
            ->with('category:id,name,color,icon')
            ->get()
            ->map(function ($item) {
                return [
                    'category_id' => $item->category_id,
                    'name' => $item->category->name ?? 'Sem categoria',
                    'color' => $item->category->color ?? '#6B7280',
                    'icon' => $item->category->icon ?? '📊',
                    'total' => (float) $item->total,
                ];
            })
            ->sortByDesc('total')
            ->values()
            ->toArray();
    }

    /**
     * Agrupa transações por conta
     */
    public function getByAccount(int $userId, array $filters): array
    {
        $query = Transaction::where('user_id', $userId)
            ->whereNotIn('status', ['estornada', 'cancelada'])
            ->whereNotNull('account_id');

        $query = $this->apply($query, $filters);

        return $query->selectRaw('account_id, type, SUM(value) as total')
            ->groupBy('account_id', 'type')
            ->with('account:id,name,color')
            ->get()
            ->groupBy('account_id')
            ->map(function ($items) {
                $first = $items->first();
                $receita = $items->firstWhere('type', 'receita')?->total ?? 0;
                $despesa = $items->firstWhere('type', 'despesa')?->total ?? 0;

                return [
                    'account_id' => $first->account_id,
                    'name' => $first->account->name ?? 'Conta',
                    'color' => $first->account->color ?? '#6B7280',
                    'receita' => (float) $receita,
                    'despesa' => (float) $despesa,
                    'saldo' => (float) ($receita - $despesa),
                ];
            })
            ->values()
            ->toArray();
    }

    /**
     * Evolução mensal (receita vs despesa por mês)
     */
    /**
     * Evolução mensal (receita vs despesa por mês)
     * Include 'accumulated_balance' for line charts
     */
    public function getMonthlyEvolution(int $userId, array $filters): array
    {
        // 1. Calculate Initial Balance (sum of transactions before the period)
        $initialBalance = 0;
        if (!empty($filters['date_from'])) {
            $initialQuery = Transaction::where('user_id', $userId)
                ->whereNotIn('status', ['estornada', 'cancelada']);

            // Apply all filters EXCEPT dates
            $preFilters = $filters;
            unset($preFilters['date_from'], $preFilters['date_to']);
            $initialQuery = $this->apply($initialQuery, $preFilters);

            // Constrain to before start date
            $initialQuery->whereDate('date', '<', $filters['date_from']);

            $initialBalance = $initialQuery->sum(
                \DB::raw("CASE WHEN type = 'receita' THEN value WHEN type = 'despesa' THEN -value ELSE 0 END")
            );
        }

        // 2. Get Monthly Data
        $query = Transaction::where('user_id', $userId)
            ->whereNotIn('status', ['estornada', 'cancelada']);

        $query = $this->apply($query, $filters);

        $monthExpression = DatabaseDateHelper::monthYear('date');
        $monthlyData = $query->selectRaw("{$monthExpression} as month, type, SUM(value) as total")
            ->groupBy('month', 'type')
            ->orderBy('month')
            ->get()
            ->groupBy('month');

        // 3. Process and Accumulate
        $result = [];
        $runningBalance = $initialBalance;

        foreach ($monthlyData as $month => $items) {
            $receita = $items->firstWhere('type', 'receita')?->total ?? 0;
            $despesa = $items->firstWhere('type', 'despesa')?->total ?? 0;
            $monthlyBalance = $receita - $despesa;
            $runningBalance += $monthlyBalance;

            $result[] = [
                'month' => $month,
                'receita' => (float) $receita,
                'despesa' => (float) $despesa,
                'saldo' => (float) $monthlyBalance,
                'accumulated_balance' => (float) $runningBalance,
            ];
        }

        return $result;
    }

    /**
     * Extrai filtros válidos de um Request
     */
    public function extractFilters(array $input): array
    {
        $filters = [];

        foreach (self::FILTER_PARAMS as $param) {
            if (isset($input[$param]) && $input[$param] !== '' && $input[$param] !== null) {
                $filters[$param] = $input[$param];
            }
        }

        return $filters;
    }
}

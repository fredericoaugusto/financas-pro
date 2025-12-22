<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Card;
use App\Models\Transaction;
use App\Models\CardInvoice;
use App\Services\TransactionFilterService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    protected TransactionFilterService $filterService;

    public function __construct(TransactionFilterService $filterService)
    {
        $this->filterService = $filterService;
    }
    /**
     * Dados do dashboard principal
     */
    public function dashboard(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $now = Carbon::now();
        $startOfMonth = $now->copy()->startOfMonth();
        $endOfMonth = $now->copy()->endOfMonth();

        // Saldo total das contas
        $totalBalance = Account::where('user_id', $userId)
            ->where('is_active', true)
            ->get()
            ->sum('current_balance');

        // Receitas do mês
        $monthIncome = Transaction::where('user_id', $userId)
            ->where('type', 'receita')
            ->where('affects_balance', true)
            ->where('status', 'confirmada')
            ->whereBetween('date', [$startOfMonth, $endOfMonth])
            ->sum('value');

        // Despesas do mês
        $monthExpenses = Transaction::where('user_id', $userId)
            ->where('type', 'despesa')
            ->where('affects_balance', true)
            ->where('status', 'confirmada')
            ->whereBetween('date', [$startOfMonth, $endOfMonth])
            ->sum('value');

        // Faturas em aberto
        $openInvoices = CardInvoice::whereHas('card', function ($query) use ($userId) {
            $query->where('user_id', $userId);
        })
            ->whereIn('status', ['aberta', 'fechada', 'parcialmente_paga'])
            ->sum(DB::raw('total_value - paid_value'));

        // Gastos por categoria (últimos 30 dias)
        $expensesByCategory = Transaction::where('user_id', $userId)
            ->where('type', 'despesa')
            ->where('affects_balance', true)
            ->where('status', 'confirmada')
            ->where('date', '>=', $now->copy()->subDays(30))
            ->with('category')
            ->get()
            ->groupBy('category_id')
            ->map(function ($transactions) {
                $category = $transactions->first()->category;
                return [
                    'category' => $category ? $category->name : 'Sem categoria',
                    'color' => $category ? $category->color : '#6b7280',
                    'total' => $transactions->sum('value'),
                ];
            })
            ->values();

        // Transações recentes
        $recentTransactions = Transaction::where('user_id', $userId)
            ->where('affects_balance', true)
            ->with(['account', 'card', 'category'])
            ->orderBy('date', 'desc')
            ->orderBy('id', 'desc')
            ->take(5)
            ->get();

        // Próximas contas (faturas próximas)
        $upcomingBills = CardInvoice::whereHas('card', function ($query) use ($userId) {
            $query->where('user_id', $userId);
        })
            ->whereIn('status', ['aberta', 'fechada'])
            ->where('due_date', '>=', $now)
            ->orderBy('due_date')
            ->take(5)
            ->with('card')
            ->get()
            ->map(function ($invoice) {
                return [
                    'id' => $invoice->id,
                    'description' => "Fatura {$invoice->card->name}",
                    'due_date' => $invoice->due_date,
                    'value' => $invoice->total_value - $invoice->paid_value,
                ];
            });

        return response()->json([
            'data' => [
                'total_balance' => round($totalBalance, 2),
                'month_income' => round($monthIncome, 2),
                'month_expenses' => round($monthExpenses, 2),
                'open_invoices' => round($openInvoices, 2),
                'balance_trend' => 0, // TODO: calcular tendência
                'income_trend' => 0,
                'expenses_trend' => 0,
                'expenses_by_category' => $expensesByCategory,
                'recent_transactions' => $recentTransactions,
                'upcoming_bills' => $upcomingBills,
            ],
        ]);
    }

    /**
     * Relatório de um período específico
     */
    public function period(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
        ]);

        $userId = $request->user()->id;
        $startDate = Carbon::parse($validated['start_date']);
        $endDate = Carbon::parse($validated['end_date']);

        $transactions = Transaction::where('user_id', $userId)
            ->where('affects_balance', true)
            ->where('status', 'confirmada')
            ->whereBetween('date', [$startDate, $endDate])
            ->with('category')
            ->get();

        $income = $transactions->where('type', 'receita')->sum('value');
        $expenses = $transactions->where('type', 'despesa')->sum('value');

        $byCategory = $transactions
            ->where('type', 'despesa')
            ->groupBy('category_id')
            ->map(function ($items) {
                $category = $items->first()->category;
                return [
                    'category' => $category ? $category->name : 'Sem categoria',
                    'total' => $items->sum('value'),
                    'count' => $items->count(),
                ];
            })
            ->sortByDesc('total')
            ->values();

        return response()->json([
            'data' => [
                'period' => [
                    'start' => $startDate->toDateString(),
                    'end' => $endDate->toDateString(),
                ],
                'summary' => [
                    'income' => round($income, 2),
                    'expenses' => round($expenses, 2),
                    'balance' => round($income - $expenses, 2),
                ],
                'by_category' => $byCategory,
                'transaction_count' => $transactions->count(),
            ],
        ]);
    }
    public function summary(Request $request): JsonResponse
    {
        $filters = $this->filterService->extractFilters($request->all());
        $data = $this->filterService->getAggregations($request->user()->id, $filters);
        return response()->json(['data' => $data]);
    }

    public function byCategory(Request $request): JsonResponse
    {
        $filters = $this->filterService->extractFilters($request->all());
        $data = $this->filterService->getByCategory($request->user()->id, $filters);
        return response()->json(['data' => $data]);
    }

    public function byAccount(Request $request): JsonResponse
    {
        $filters = $this->filterService->extractFilters($request->all());
        $data = $this->filterService->getByAccount($request->user()->id, $filters);
        return response()->json(['data' => $data]);
    }

    public function monthlyEvolution(Request $request): JsonResponse
    {
        $filters = $this->filterService->extractFilters($request->all());
        $data = $this->filterService->getMonthlyEvolution($request->user()->id, $filters);
        return response()->json(['data' => $data]);
    }

    public function savingsRate(Request $request): JsonResponse
    {
        $filters = $this->filterService->extractFilters($request->all());
        $totals = $this->filterService->getAggregations($request->user()->id, $filters);

        $receita = $totals['receita'];
        $despesa = $totals['despesa'];
        $savings = $receita - $despesa;

        // Evitar divisão por zero
        $rate = $receita > 0 ? ($savings / $receita) * 100 : 0;

        return response()->json([
            'data' => [
                'rate' => round($rate, 2),
                'savings' => round($savings, 2),
                'income' => $receita,
                'expenses' => $despesa
            ]
        ]);
    }

    public function fixedVsVariable(Request $request): JsonResponse
    {
        $filters = $this->filterService->extractFilters($request->all());
        $userId = $request->user()->id;

        // Base query with filters
        $query = Transaction::where('user_id', $userId)
            ->where('type', 'despesa') // Analisar apenas despesas
            ->whereNotIn('status', ['estornada', 'cancelada']);

        $query = $this->filterService->apply($query, $filters);

        $data = $query->selectRaw("
                CASE 
                    WHEN recurring_transaction_id IS NOT NULL THEN 'Fixo' 
                    ELSE 'Variável' 
                END as type, 
                SUM(value) as total
            ")
            ->groupBy('type')
            ->get();

        $formatted = $data->map(function ($item) {
            return [
                'name' => $item->type,
                'total' => (float) $item->total,
                'color' => $item->type === 'Fixo' ? '#3B82F6' : '#F59E0B', // Azul (Fixo), Laranja (Variável)
            ];
        });

        return response()->json(['data' => $formatted]);
    }

    /**
     * Evolução do Uso de Crédito (Total Faturas vs Limite)
     */
    public function creditLimitEvolution(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        // Obter limite total atual de cartões ativos
        $totalLimit = Card::where('user_id', $userId)
            ->where('status', 'ativo')
            ->sum('credit_limit');

        // Histórico de Faturas Agrupado por Mês
        $invoices = CardInvoice::whereHas('card', function ($q) use ($userId) {
            $q->where('user_id', $userId);
        })
            ->selectRaw("reference_month, SUM(total_value) as total_used")
            ->groupBy('reference_month')
            ->orderBy('reference_month')
            ->get()
            ->map(function ($inv) use ($totalLimit) {
                return [
                    'month' => $inv->reference_month, // YYYY-MM
                    'used' => (float) $inv->total_used,
                    'limit' => (float) $totalLimit // Linha de referência
                ];
            });

        return response()->json(['data' => $invoices]);
    }

    /**
     * Comprometimento Futuro (Parcelas a vencer)
     */
    public function futureCommitment(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $now = Carbon::now();

        $commitments = \App\Models\CardInstallment::whereHas('transaction', function ($q) use ($userId) {
            $q->where('user_id', $userId);
        })
            ->whereDate('due_date', '>', $now)
            ->whereNotIn('status', ['estornada', 'paga'])
            ->selectRaw("strftime('%Y-%m', due_date) as month, SUM(value) as total")
            ->groupBy('month')
            ->orderBy('month')
            ->limit(12) // Próximos 12 meses
            ->get();

        return response()->json(['data' => $commitments]);
    }

    /**
     * Top Cartões por Uso (Soma das Faturas)
     */
    public function topCards(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $topCards = CardInvoice::whereHas('card', function ($q) use ($userId) {
            $q->where('user_id', $userId);
        })
            ->join('cards', 'card_invoices.card_id', '=', 'cards.id')
            ->selectRaw("cards.id, cards.name, cards.color, SUM(card_invoices.total_value) as total")
            ->groupBy('cards.id', 'cards.name', 'cards.color')
            ->orderByDesc('total')
            ->take(5)
            ->get()
            ->map(function ($item) {
                return [
                    'name' => $item->name,
                    'total' => (float) $item->total,
                    'color' => $item->color ?? '#6B7280'
                ];
            });

        return response()->json(['data' => $topCards]);
    }
}

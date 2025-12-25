<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Category;
use App\Models\Transaction;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

class ReportController extends Controller
{
    /**
     * Export transactions as PDF.
     */
    public function transactionsPdf(Request $request)
    {
        $data = $this->getTransactionsData($request);

        if ($data['transactions']->isEmpty()) {
            return response()->json(['message' => 'Nenhuma transação encontrada para exportar.'], 422);
        }

        $pdf = Pdf::loadView('reports.transactions', $data);
        $pdf->setPaper('a4', 'portrait');

        $filename = 'transacoes_' . Carbon::now()->format('Y-m-d_His') . '.pdf';

        return $pdf->download($filename);
    }

    /**
     * Export transactions as CSV (Excel-compatible).
     */
    public function transactionsCsv(Request $request)
    {
        $data = $this->getTransactionsData($request);

        if ($data['transactions']->isEmpty()) {
            return response()->json(['message' => 'Nenhuma transação encontrada para exportar.'], 422);
        }

        $filename = 'transacoes_' . Carbon::now()->format('Y-m-d_His') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function () use ($data) {
            $file = fopen('php://output', 'w');

            // Add BOM for Excel UTF-8 compatibility
            fprintf($file, chr(0xEF) . chr(0xBB) . chr(0xBF));

            // Header info
            fputcsv($file, ['FinançasPro - Relatório de Transações'], ';');
            fputcsv($file, ['Período: ' . $data['period_label']], ';');
            fputcsv($file, ['Gerado em: ' . $data['generated_at']], ';');
            fputcsv($file, [], ';');

            // Column headers
            fputcsv($file, ['Data', 'Descrição', 'Tipo', 'Forma Pgto', 'Categoria', 'Conta', 'Valor'], ';');

            // Data rows
            foreach ($data['transactions'] as $tx) {
                fputcsv($file, [
                    Carbon::parse($tx->date)->format('d/m/Y'),
                    $tx->description,
                    ucfirst($tx->type),
                    $this->formatPaymentMethod($tx->payment_method),
                    $tx->category?->name ?? '-',
                    $tx->account?->name ?? '-',
                    number_format($tx->value, 2, ',', '.'),
                ], ';');
            }

            // Totals
            fputcsv($file, [], ';');
            fputcsv($file, ['', '', '', '', '', 'Total Receitas:', number_format($data['totals']['income'], 2, ',', '.')], ';');
            fputcsv($file, ['', '', '', '', '', 'Total Despesas:', number_format($data['totals']['expense'], 2, ',', '.')], ';');
            fputcsv($file, ['', '', '', '', '', 'Saldo:', number_format($data['totals']['balance'], 2, ',', '.')], ';');

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Export financial summary as PDF.
     */
    public function summaryPdf(Request $request)
    {
        $data = $this->getSummaryData($request);

        $pdf = Pdf::loadView('reports.summary', $data);
        $pdf->setPaper('a4', 'portrait');

        $filename = 'resumo_financeiro_' . Carbon::now()->format('Y-m-d_His') . '.pdf';

        return $pdf->download($filename);
    }

    /**
     * Get transactions data for export.
     */
    private function getTransactionsData(Request $request): array
    {
        $userId = Auth::id();
        $query = Transaction::where('user_id', $userId)
            ->with(['account', 'category', 'card']);

        // Apply filters (same as TransactionController)
        if ($request->filled('start_date')) {
            $query->where('date', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $query->where('date', '<=', $request->end_date);
        }
        if ($request->filled('type') && $request->type !== 'all') {
            $query->where('type', $request->type);
        }
        if ($request->filled('account_id')) {
            $query->where('account_id', $request->account_id);
        }
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }
        if ($request->filled('payment_method')) {
            $query->where('payment_method', $request->payment_method);
        }
        if ($request->filled('search')) {
            $query->where('description', 'like', '%' . $request->search . '%');
        }

        $transactions = $query->orderBy('date', 'desc')->get();

        // Calculate totals (transfers don't count)
        $totals = $this->calculateTotals($transactions);

        // Period label
        $periodLabel = $this->getPeriodLabel($request);

        return [
            'transactions' => $transactions,
            'totals' => $totals,
            'period_label' => $periodLabel,
            'generated_at' => Carbon::now()->format('d/m/Y H:i'),
        ];
    }

    /**
     * Get summary data for export.
     */
    private function getSummaryData(Request $request): array
    {
        $userId = Auth::id();
        $query = Transaction::where('user_id', $userId);

        // Apply date filters
        if ($request->filled('start_date')) {
            $query->where('date', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $query->where('date', '<=', $request->end_date);
        }

        $transactions = $query->get();
        $totals = $this->calculateTotals($transactions);

        // Expenses by category (ordered by value desc, with percentage)
        $expensesByCategory = $transactions
            ->where('type', 'despesa')
            ->groupBy('category_id')
            ->map(function ($group) use ($totals) {
                $value = $group->sum('value');
                $percentage = $totals['expense'] > 0 ? ($value / $totals['expense']) * 100 : 0;
                return [
                    'category' => $group->first()->category?->name ?? 'Sem categoria',
                    'value' => $value,
                    'percentage' => $percentage,
                ];
            })
            ->sortByDesc('value')
            ->values();

        // Income by category (ordered by value desc, with percentage)
        $incomeByCategory = $transactions
            ->where('type', 'receita')
            ->groupBy('category_id')
            ->map(function ($group) use ($totals) {
                $value = $group->sum('value');
                $percentage = $totals['income'] > 0 ? ($value / $totals['income']) * 100 : 0;
                return [
                    'category' => $group->first()->category?->name ?? 'Sem categoria',
                    'value' => $value,
                    'percentage' => $percentage,
                ];
            })
            ->sortByDesc('value')
            ->values();

        return [
            'totals' => $totals,
            'expenses_by_category' => $expensesByCategory,
            'income_by_category' => $incomeByCategory,
            'period_label' => $this->getPeriodLabel($request),
            'generated_at' => Carbon::now()->format('d/m/Y H:i'),
        ];
    }

    /**
     * Calculate totals.
     * IMPORTANT: Transfers (transferencia) don't count in income or expense.
     */
    private function calculateTotals($transactions): array
    {
        $income = $transactions->where('type', 'receita')->sum('value');
        $expense = $transactions->where('type', 'despesa')->sum('value');
        // Transfers are excluded from balance calculation

        return [
            'income' => $income,
            'expense' => $expense,
            'balance' => $income - $expense,
        ];
    }

    /**
     * Get period label from request.
     */
    private function getPeriodLabel(Request $request): string
    {
        $start = $request->filled('start_date')
            ? Carbon::parse($request->start_date)->format('d/m/Y')
            : 'Início';
        $end = $request->filled('end_date')
            ? Carbon::parse($request->end_date)->format('d/m/Y')
            : 'Hoje';

        return "{$start} a {$end}";
    }

    /**
     * Format payment method for display.
     */
    private function formatPaymentMethod(?string $method): string
    {
        $methods = [
            'pix' => 'PIX',
            'debit' => 'Débito',
            'credit' => 'Crédito',
            'transfer' => 'Transferência',
            'boleto' => 'Boleto',
            'dinheiro' => 'Dinheiro',
        ];

        return $methods[$method] ?? ($method ?? '-');
    }

    /**
     * Get transactions by category for charts.
     */
    public function byCategory(Request $request)
    {
        $userId = Auth::id();
        $query = Transaction::where('user_id', $userId)
            ->with('category');

        if ($request->filled('date_from')) {
            $query->where('date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->where('date', '<=', $request->date_to);
        }
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }
        if ($request->filled('account_id')) {
            $query->where('account_id', $request->account_id);
        }

        $transactions = $query->get();

        $grouped = $transactions->groupBy('category_id')->map(function ($group) {
            $category = $group->first()->category;
            return [
                'category_id' => $category?->id,
                'name' => $category?->name ?? 'Sem categoria',
                'color' => $category?->color ?? '#6b7280',
                'total' => $group->sum('value'),
            ];
        })->sortByDesc('total')->values();

        return response()->json(['data' => $grouped]);
    }

    /**
     * Get transactions by account for charts.
     */
    public function byAccount(Request $request)
    {
        $userId = Auth::id();
        $query = Transaction::where('user_id', $userId)
            ->with('account');

        if ($request->filled('date_from')) {
            $query->where('date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->where('date', '<=', $request->date_to);
        }
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        $transactions = $query->get();

        $grouped = $transactions->groupBy('account_id')->map(function ($group) {
            $account = $group->first()->account;
            return [
                'account_id' => $account?->id,
                'name' => $account?->name ?? 'Sem conta',
                'color' => $account?->color ?? '#6b7280',
                'total' => $group->sum('value'),
            ];
        })->sortByDesc('total')->values();

        return response()->json(['data' => $grouped]);
    }

    /**
     * Get monthly evolution data for charts.
     */
    public function monthlyEvolution(Request $request)
    {
        $userId = Auth::id();
        $type = $request->input('type', 'despesa');

        $query = Transaction::where('user_id', $userId)
            ->where('type', $type);

        if ($request->filled('date_from')) {
            $query->where('date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->where('date', '<=', $request->date_to);
        }

        $transactions = $query->get();

        $grouped = $transactions->groupBy(function ($item) {
            return Carbon::parse($item->date)->format('Y-m');
        })->map(function ($group, $month) {
            return [
                'month' => $month,
                'label' => Carbon::createFromFormat('Y-m', $month)->translatedFormat('M/Y'),
                'total' => $group->sum('value'),
            ];
        })->sortKeys()->values();

        return response()->json(['data' => $grouped]);
    }

    /**
     * Calculate savings rate.
     */
    public function savingsRate(Request $request)
    {
        $userId = Auth::id();
        $query = Transaction::where('user_id', $userId);

        if ($request->filled('date_from')) {
            $query->where('date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->where('date', '<=', $request->date_to);
        }

        $transactions = $query->get();

        $income = $transactions->where('type', 'receita')->sum('value');
        $expenses = $transactions->where('type', 'despesa')->sum('value');
        $savings = $income - $expenses;
        $rate = $income > 0 ? ($savings / $income) * 100 : 0;

        return response()->json([
            'data' => [
                'income' => $income,
                'expenses' => $expenses,
                'savings' => $savings,
                'rate' => round($rate, 1),
            ]
        ]);
    }

    /**
     * Get fixed vs variable expenses.
     */
    public function fixedVsVariable(Request $request)
    {
        $userId = Auth::id();
        $query = Transaction::where('user_id', $userId)
            ->where('type', 'despesa');

        if ($request->filled('date_from')) {
            $query->where('date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->where('date', '<=', $request->date_to);
        }

        $transactions = $query->get();

        $fixed = $transactions->whereNotNull('recurring_transaction_id')->sum('value');
        $variable = $transactions->whereNull('recurring_transaction_id')->sum('value');
        $total = $fixed + $variable;

        return response()->json([
            'data' => [
                'fixed' => $fixed,
                'variable' => $variable,
                'fixed_pct' => $total > 0 ? round(($fixed / $total) * 100, 1) : 0,
                'variable_pct' => $total > 0 ? round(($variable / $total) * 100, 1) : 0,
            ]
        ]);
    }

    /**
     * Get credit limit evolution.
     */
    public function creditLimitEvolution(Request $request)
    {
        $userId = Auth::id();
        $cards = \App\Models\Card::where('user_id', $userId)
            ->where('is_archived', false)
            ->get();

        $data = $cards->map(function ($card) {
            return [
                'name' => $card->name,
                'limit' => $card->limit,
                'used' => $card->limit - $card->available_limit,
                'available' => $card->available_limit,
            ];
        });

        return response()->json(['data' => $data]);
    }

    /**
     * Get future commitment data.
     */
    public function futureCommitment(Request $request)
    {
        $userId = Auth::id();
        $nextMonths = 3;
        $data = [];

        for ($i = 0; $i < $nextMonths; $i++) {
            $date = Carbon::now()->addMonths($i);
            $monthKey = $date->format('Y-m');

            // Get recurring transactions for this month
            $recurring = \App\Models\RecurringTransaction::where('user_id', $userId)
                ->where('status', 'active')
                ->where('type', 'despesa')
                ->get()
                ->sum('value');

            $data[] = [
                'month' => $monthKey,
                'label' => $date->translatedFormat('M/Y'),
                'total' => $recurring,
            ];
        }

        return response()->json(['data' => $data]);
    }

    /**
     * Get top cards by spending.
     */
    public function topCards(Request $request)
    {
        $userId = Auth::id();
        $startDate = $request->input('date_from', Carbon::now()->startOfMonth()->format('Y-m-d'));
        $endDate = $request->input('date_to', Carbon::now()->endOfMonth()->format('Y-m-d'));

        $cards = \App\Models\Card::where('user_id', $userId)
            ->where('is_archived', false)
            ->withSum([
                'transactions as total_spent' => function ($query) use ($startDate, $endDate) {
                    $query->where('type', 'despesa')
                        ->whereBetween('date', [$startDate, $endDate]);
                }
            ], 'value')
            ->orderByDesc('total_spent')
            ->take(5)
            ->get();

        $data = $cards->map(function ($card) {
            return [
                'id' => $card->id,
                'name' => $card->name,
                'brand' => $card->brand,
                'total_spent' => $card->total_spent ?? 0,
            ];
        });

        return response()->json(['data' => $data]);
    }

    /**
     * Get budget vs actual spending.
     */
    public function budgetVsActual(Request $request)
    {
        $userId = Auth::id();
        $month = $request->input('month', Carbon::now()->format('Y-m'));

        $budgets = \App\Models\Budget::where('user_id', $userId)
            ->with('category')
            ->get();

        $data = $budgets->map(function ($budget) use ($month) {
            $spent = Transaction::where('user_id', $budget->user_id)
                ->where('category_id', $budget->category_id)
                ->where('type', 'despesa')
                ->whereRaw("strftime('%Y-%m', date) = ?", [$month])
                ->sum('value');

            return [
                'category' => $budget->category?->name ?? 'Sem categoria',
                'color' => $budget->category?->color ?? '#6b7280',
                'budget' => $budget->amount,
                'spent' => $spent,
                'remaining' => $budget->amount - $spent,
                'percentage' => $budget->amount > 0 ? round(($spent / $budget->amount) * 100, 1) : 0,
            ];
        });

        return response()->json(['data' => $data]);
    }

    /**
     * Get budget consumption for donut chart.
     */
    public function budgetConsumption(Request $request)
    {
        $userId = Auth::id();
        $month = $request->input('month', Carbon::now()->format('Y-m'));

        $budgets = \App\Models\Budget::where('user_id', $userId)->get();

        $totalBudget = $budgets->sum('amount');
        $totalSpent = 0;

        foreach ($budgets as $budget) {
            $spent = Transaction::where('user_id', $userId)
                ->where('category_id', $budget->category_id)
                ->where('type', 'despesa')
                ->whereRaw("strftime('%Y-%m', date) = ?", [$month])
                ->sum('value');
            $totalSpent += $spent;
        }

        return response()->json([
            'data' => [
                'total_budget' => $totalBudget,
                'total_spent' => $totalSpent,
                'remaining' => $totalBudget - $totalSpent,
                'percentage' => $totalBudget > 0 ? round(($totalSpent / $totalBudget) * 100, 1) : 0,
            ]
        ]);
    }

    /**
     * Get budget alerts.
     */
    public function budgetAlerts(Request $request)
    {
        $userId = Auth::id();
        $month = Carbon::now()->format('Y-m');

        $budgets = \App\Models\Budget::where('user_id', $userId)
            ->with('category')
            ->get();

        $alerts = [];

        foreach ($budgets as $budget) {
            $spent = Transaction::where('user_id', $userId)
                ->where('category_id', $budget->category_id)
                ->where('type', 'despesa')
                ->whereRaw("strftime('%Y-%m', date) = ?", [$month])
                ->sum('value');

            $percentage = $budget->amount > 0 ? ($spent / $budget->amount) * 100 : 0;

            if ($percentage >= 80) {
                $alerts[] = [
                    'category' => $budget->category?->name ?? 'Sem categoria',
                    'color' => $budget->category?->color ?? '#6b7280',
                    'budget' => $budget->amount,
                    'spent' => $spent,
                    'percentage' => round($percentage, 1),
                    'status' => $percentage >= 100 ? 'exceeded' : 'warning',
                ];
            }
        }

        return response()->json(['data' => $alerts]);
    }

    /**
     * Get goals progress.
     */
    public function goalsProgress(Request $request)
    {
        $userId = Auth::id();

        $goals = \App\Models\Goal::where('user_id', $userId)
            ->where('status', 'em_andamento')
            ->get();

        $data = $goals->map(function ($goal) {
            return [
                'id' => $goal->id,
                'name' => $goal->name,
                'icon' => $goal->icon,
                'color' => $goal->color,
                'target' => $goal->target_value,
                'current' => $goal->current_value,
                'percentage' => $goal->progress_percentage,
                'remaining' => $goal->remaining_value,
            ];
        });

        return response()->json(['data' => $data]);
    }
}

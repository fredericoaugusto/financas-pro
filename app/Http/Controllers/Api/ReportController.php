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
}

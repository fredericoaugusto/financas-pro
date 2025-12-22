<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RecurringTransaction;
use App\Models\AuditLog;
use App\Services\RecurringTransactionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;

class RecurringTransactionController extends Controller
{
    protected RecurringTransactionService $service;

    public function __construct(RecurringTransactionService $service)
    {
        $this->service = $service;
    }

    /**
     * Listar recorrências do usuário
     */
    public function index(Request $request): JsonResponse
    {
        $query = RecurringTransaction::where('user_id', $request->user()->id)
            ->with(['category', 'account', 'card'])
            ->orderBy('next_occurrence');

        // Filtro por status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $recurrings = $query->get();

        return response()->json([
            'data' => $recurrings,
        ]);
    }

    /**
     * Criar nova recorrência
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'in:receita,despesa'],
            'value' => ['required', 'numeric', 'min:0.01'],
            'description' => ['required', 'string', 'max:255'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'account_id' => ['nullable', 'exists:accounts,id'],
            'card_id' => ['nullable', 'exists:cards,id'],
            'payment_method' => ['nullable', 'in:dinheiro,debito,credito,pix,boleto,transferencia'],
            'notes' => ['nullable', 'string'],
            'frequency' => ['required', 'in:semanal,mensal,anual,personalizada'],
            'frequency_value' => ['required', 'integer', 'min:1', 'max:365'],
            'start_date' => ['required', 'date'],
            'end_date' => ['nullable', 'date', 'after:start_date'],
        ], [
            'type.required' => 'O tipo é obrigatório.',
            'value.required' => 'O valor é obrigatório.',
            'value.min' => 'O valor deve ser maior que zero.',
            'description.required' => 'A descrição é obrigatória.',
            'frequency.required' => 'A frequência é obrigatória.',
            'start_date.required' => 'A data de início é obrigatória.',
        ]);

        // Primeira ocorrência é a start_date (se <= hoje) ou a própria start_date
        $startDate = Carbon::parse($validated['start_date']);
        $nextOccurrence = $startDate->isFuture() ? $startDate : $startDate;

        $recurring = RecurringTransaction::create([
            'user_id' => $request->user()->id,
            ...$validated,
            'next_occurrence' => $nextOccurrence,
            'status' => 'ativa',
        ]);

        AuditLog::log('create', 'RecurringTransaction', $recurring->id, [
            'description' => $recurring->description,
            'type' => $recurring->type,
            'frequency' => $recurring->frequency,
        ]);

        return response()->json([
            'message' => 'Recorrência criada com sucesso!',
            'data' => $recurring->load(['category', 'account', 'card']),
        ], 201);
    }

    /**
     * Exibir uma recorrência
     */
    public function show(Request $request, RecurringTransaction $recurringTransaction): JsonResponse
    {
        if ($recurringTransaction->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        return response()->json([
            'data' => $recurringTransaction->load(['category', 'account', 'card', 'transactions']),
        ]);
    }

    /**
     * Atualizar recorrência
     * 
     * IMPORTANTE: Só afeta gerações FUTURAS
     */
    public function update(Request $request, RecurringTransaction $recurringTransaction): JsonResponse
    {
        if ($recurringTransaction->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        $validated = $request->validate([
            'type' => ['sometimes', 'in:receita,despesa'],
            'value' => ['sometimes', 'numeric', 'min:0.01'],
            'description' => ['sometimes', 'string', 'max:255'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'account_id' => ['nullable', 'exists:accounts,id'],
            'card_id' => ['nullable', 'exists:cards,id'],
            'payment_method' => ['nullable', 'in:dinheiro,debito,credito,pix,boleto,transferencia'],
            'notes' => ['nullable', 'string'],
            'frequency' => ['sometimes', 'in:semanal,mensal,anual,personalizada'],
            'frequency_value' => ['sometimes', 'integer', 'min:1', 'max:365'],
            'end_date' => ['nullable', 'date'],
        ]);

        $recurringTransaction->update($validated);

        AuditLog::log('update', 'RecurringTransaction', $recurringTransaction->id, [
            'changes' => array_keys($validated),
        ]);

        return response()->json([
            'message' => 'Recorrência atualizada!',
            'data' => $recurringTransaction->fresh(['category', 'account', 'card']),
        ]);
    }

    /**
     * Pausar recorrência
     * 
     * IMPORTANTE: Ao pausar, remove transações PENDENTES futuras no cartão
     */
    public function pause(Request $request, RecurringTransaction $recurringTransaction): JsonResponse
    {
        if ($recurringTransaction->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        if ($recurringTransaction->status === 'encerrada') {
            return response()->json([
                'message' => 'Não é possível pausar uma recorrência encerrada.',
            ], 422);
        }

        $recurringTransaction->update(['status' => 'pausada']);

        // Se é recorrência no cartão, remover transações PENDENTES futuras
        if ($recurringTransaction->card_id) {
            $this->removePendingFutureTransactions($recurringTransaction);
        }

        AuditLog::log('pause', 'RecurringTransaction', $recurringTransaction->id);

        return response()->json([
            'message' => 'Recorrência pausada!',
            'data' => $recurringTransaction->fresh(['category', 'account', 'card']),
        ]);
    }

    /**
     * Remove transações pendentes de recorrência no cartão
     * Usado quando pausa ou encerra recorrência
     */
    protected function removePendingFutureTransactions(RecurringTransaction $recurring): void
    {
        // Buscar transações pendentes desta recorrência
        $pendingTransactions = \App\Models\Transaction::where('recurring_transaction_id', $recurring->id)
            ->where('status', 'pendente')
            ->whereDate('date', '>=', Carbon::today())
            ->get();

        foreach ($pendingTransactions as $transaction) {
            // Remover parcelas pendentes da fatura
            \App\Models\CardInstallment::where('transaction_id', $transaction->id)
                ->where('status', 'pendente')
                ->delete();

            // Remover a transação
            $transaction->delete();

            // Recalcular totais da fatura se existir
            if ($transaction->card_invoice_id) {
                $invoice = \App\Models\CardInvoice::find($transaction->card_invoice_id);
                if ($invoice) {
                    $invoice->recalculateTotal();
                }
            }
        }
    }

    /**
     * Retomar recorrência pausada
     */
    public function resume(Request $request, RecurringTransaction $recurringTransaction): JsonResponse
    {
        if ($recurringTransaction->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        if ($recurringTransaction->status !== 'pausada') {
            return response()->json([
                'message' => 'Apenas recorrências pausadas podem ser retomadas.',
            ], 422);
        }

        // Se next_occurrence está no passado, atualizar para hoje
        $nextOccurrence = $recurringTransaction->next_occurrence;
        if ($nextOccurrence->isPast()) {
            $nextOccurrence = Carbon::today();
        }

        $recurringTransaction->update([
            'status' => 'ativa',
            'next_occurrence' => $nextOccurrence,
        ]);

        AuditLog::log('resume', 'RecurringTransaction', $recurringTransaction->id);

        return response()->json([
            'message' => 'Recorrência retomada!',
            'data' => $recurringTransaction->fresh(),
        ]);
    }

    /**
     * Encerrar recorrência (permanente)
     * 
     * IMPORTANTE: Remove transações PENDENTES futuras no cartão
     */
    public function end(Request $request, RecurringTransaction $recurringTransaction): JsonResponse
    {
        if ($recurringTransaction->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        if ($recurringTransaction->status === 'encerrada') {
            return response()->json([
                'message' => 'Recorrência já está encerrada.',
            ], 422);
        }

        $recurringTransaction->update([
            'status' => 'encerrada',
            'end_date' => Carbon::today(),
        ]);

        // Se é recorrência no cartão, remover transações PENDENTES futuras
        if ($recurringTransaction->card_id) {
            $this->removePendingFutureTransactions($recurringTransaction);
        }

        AuditLog::log('end', 'RecurringTransaction', $recurringTransaction->id);

        return response()->json([
            'message' => 'Recorrência encerrada permanentemente.',
            'data' => $recurringTransaction->fresh(['category', 'account', 'card']),
        ]);
    }

    /**
     * Excluir recorrência (somente se nunca gerou transações)
     */
    public function destroy(Request $request, RecurringTransaction $recurringTransaction): JsonResponse
    {
        if ($recurringTransaction->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        // Verificar se já gerou transações
        if ($recurringTransaction->transactions()->count() > 0) {
            return response()->json([
                'message' => 'Esta recorrência já gerou transações. Use "Encerrar" ao invés de excluir.',
            ], 422);
        }

        AuditLog::log('delete', 'RecurringTransaction', $recurringTransaction->id);

        $recurringTransaction->delete();

        return response()->json([
            'message' => 'Recorrência excluída!',
        ]);
    }

    /**
     * Gerar transação manualmente (força geração imediata)
     */
    public function generate(Request $request, RecurringTransaction $recurringTransaction): JsonResponse
    {
        if ($recurringTransaction->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        if ($recurringTransaction->status !== 'ativa') {
            return response()->json([
                'message' => 'Apenas recorrências ativas podem gerar transações.',
            ], 422);
        }

        try {
            $transaction = $this->service->generateTransaction($recurringTransaction);

            return response()->json([
                'message' => 'Transação gerada com sucesso!',
                'data' => [
                    'transaction' => $transaction->load(['category', 'account']),
                    'recurring' => $recurringTransaction->fresh(),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erro ao gerar transação: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Retorna projeção de recorrências para um período
     * Usado para cálculo de saldo previsto no dashboard
     */
    public function projection(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
        ]);

        $projection = $this->service->calculateProjection(
            $request->user()->id,
            $request->start_date,
            $request->end_date
        );

        return response()->json([
            'data' => [
                'receitas' => $projection['receitas'],
                'despesas' => $projection['despesas'],
                'saldo_projetado' => $projection['receitas'] - $projection['despesas'],
            ],
        ]);
    }
}

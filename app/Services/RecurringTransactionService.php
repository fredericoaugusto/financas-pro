<?php

namespace App\Services;

use App\Models\RecurringTransaction;
use App\Models\Transaction;
use App\Models\CardInvoice;
use App\Models\CardInstallment;
use App\Models\AuditLog;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * RecurringTransactionService
 * 
 * REGRAS IMPORTANTES:
 * - Uma execução = no máximo 1 transação por recorrência
 * - Nunca gera retroativos
 * - Idempotente: pode rodar múltiplas vezes sem duplicar
 * - next_occurrence é a única referência temporal
 * - Suporta conta OU cartão de crédito
 */
class RecurringTransactionService
{
    protected InvoiceService $invoiceService;

    public function __construct(InvoiceService $invoiceService)
    {
        $this->invoiceService = $invoiceService;
    }

    /**
     * Gera transações para todas as recorrências que devem ser geradas
     * 
     * @return array Resultado com contadores
     */
    public function generateDue(): array
    {
        $today = Carbon::today();
        $generated = 0;
        $skipped = 0;
        $errors = [];

        // Buscar recorrências que devem gerar
        $recurrings = RecurringTransaction::where('status', 'ativa')
            ->where('next_occurrence', '<=', $today)
            ->where(function ($query) use ($today) {
                $query->whereNull('end_date')
                    ->orWhere('end_date', '>=', $today);
            })
            ->get();

        Log::info("[Recurring] Starting generation. Found {$recurrings->count()} candidates.");

        foreach ($recurrings as $recurring) {
            try {
                if (!$recurring->shouldGenerate()) {
                    $skipped++;
                    continue;
                }

                $this->generateTransaction($recurring);
                $generated++;

            } catch (\Exception $e) {
                $errors[] = [
                    'recurring_id' => $recurring->id,
                    'error' => $e->getMessage(),
                ];
                Log::error("[Recurring] Error generating for ID {$recurring->id}: {$e->getMessage()}");
            }
        }

        Log::info("[Recurring] Generation complete. Generated: {$generated}, Skipped: {$skipped}, Errors: " . count($errors));

        return [
            'generated' => $generated,
            'skipped' => $skipped,
            'errors' => $errors,
        ];
    }

    /**
     * Gera uma única transação para uma recorrência
     */
    public function generateTransaction(RecurringTransaction $recurring): Transaction
    {
        return DB::transaction(function () use ($recurring) {
            $transactionDate = $recurring->next_occurrence;

            // Se for recorrência no cartão de crédito
            if ($recurring->card_id) {
                return $this->generateCardTransaction($recurring, $transactionDate);
            }

            // Recorrência em conta (padrão)
            return $this->generateAccountTransaction($recurring, $transactionDate);
        });
    }

    /**
     * Gera transação para conta bancária
     */
    protected function generateAccountTransaction(RecurringTransaction $recurring, Carbon $transactionDate): Transaction
    {
        $transaction = Transaction::create([
            'user_id' => $recurring->user_id,
            'recurring_transaction_id' => $recurring->id,
            'type' => $recurring->type,
            'value' => $recurring->value,
            'description' => $recurring->description,
            'date' => $transactionDate->format('Y-m-d'),
            'category_id' => $recurring->category_id,
            'account_id' => $recurring->account_id,
            'payment_method' => $recurring->payment_method ?? 'dinheiro',
            'notes' => $recurring->notes ? "[Recorrência] {$recurring->notes}" : '[Recorrência automática]',
            'affects_balance' => true,
            'status' => 'confirmada',
        ]);

        $this->updateRecurringAfterGeneration($recurring, $transactionDate, $transaction->id);

        return $transaction;
    }

    /**
     * Gera transação para cartão de crédito (vai para fatura)
     */
    protected function generateCardTransaction(RecurringTransaction $recurring, Carbon $transactionDate): Transaction
    {
        // Criar transação
        $transaction = Transaction::create([
            'user_id' => $recurring->user_id,
            'recurring_transaction_id' => $recurring->id,
            'type' => 'despesa', // Cartão de crédito sempre é despesa
            'value' => $recurring->value,
            'description' => $recurring->description,
            'date' => $transactionDate->format('Y-m-d'),
            'category_id' => $recurring->category_id,
            'card_id' => $recurring->card_id,
            'payment_method' => 'credito',
            'notes' => $recurring->notes ? "[Recorrência] {$recurring->notes}" : '[Recorrência automática]',
            'affects_balance' => false, // Cartão não afeta saldo diretamente
            'status' => 'confirmada',
            'total_installments' => 1,
            'installment_value' => $recurring->value,
        ]);

        // Obter ou criar fatura para a data
        $invoice = $this->invoiceService->getOrCreateInvoice($recurring->card, $transactionDate);

        // Vincular transação à fatura
        $transaction->update(['card_invoice_id' => $invoice->id]);

        // Criar item na fatura (parcela única)
        CardInstallment::create([
            'card_id' => $recurring->card_id,
            'card_invoice_id' => $invoice->id,
            'transaction_id' => $transaction->id,
            'installment_number' => 1,
            'total_installments' => 1,
            'value' => $recurring->value,
            'due_date' => $invoice->due_date,
            'status' => 'pendente',
        ]);

        // Atualizar total da fatura
        $invoice->recalculateTotal();

        $this->updateRecurringAfterGeneration($recurring, $transactionDate, $transaction->id);

        Log::info("[Recurring] Generated card transaction {$transaction->id} for recurring {$recurring->id} on invoice {$invoice->id}");

        return $transaction;
    }

    /**
     * Atualiza recorrência após geração
     */
    protected function updateRecurringAfterGeneration(RecurringTransaction $recurring, Carbon $generatedDate, int $transactionId): void
    {
        $nextOccurrence = $recurring->calculateNextOccurrence();

        $recurring->update([
            'last_generated_at' => $generatedDate,
            'next_occurrence' => $nextOccurrence,
        ]);

        // Verificar se a próxima ocorrência ultrapassa end_date
        if ($recurring->end_date && $nextOccurrence->gt($recurring->end_date)) {
            $recurring->update(['status' => 'encerrada']);
            Log::info("[Recurring] ID {$recurring->id} reached end_date, marked as encerrada.");
        }

        // Audit log
        AuditLog::log('generate_recurring', 'RecurringTransaction', $recurring->id, [
            'transaction_id' => $transactionId,
            'date' => $generatedDate->format('Y-m-d'),
        ]);

        Log::info("[Recurring] Generated transaction {$transactionId} for recurring {$recurring->id}");
    }

    /**
     * Calcula o valor projetado das recorrências para um período
     * Usado para saldo previsto no dashboard
     * 
     * @param int $userId
     * @param string $startDate
     * @param string $endDate
     * @return array ['receitas' => float, 'despesas' => float]
     */
    public function calculateProjection(int $userId, string $startDate, string $endDate): array
    {
        $start = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);

        $receitas = 0;
        $despesas = 0;

        // Buscar recorrências ativas do usuário
        $recurrings = RecurringTransaction::where('user_id', $userId)
            ->where('status', 'ativa')
            ->where('next_occurrence', '<=', $end)
            ->where(function ($query) use ($start) {
                $query->whereNull('end_date')
                    ->orWhere('end_date', '>=', $start);
            })
            ->get();

        foreach ($recurrings as $recurring) {
            $occurrence = $recurring->next_occurrence->copy();

            // Contar quantas ocorrências caem no período
            while ($occurrence->lte($end)) {
                // Só conta se está dentro do período e não passou do end_date
                if ($occurrence->gte($start)) {
                    if ($recurring->end_date && $occurrence->gt($recurring->end_date)) {
                        break;
                    }

                    if ($recurring->type === 'receita') {
                        $receitas += $recurring->value;
                    } else {
                        $despesas += $recurring->value;
                    }
                }

                // Próxima ocorrência
                $occurrence = $this->addFrequency($occurrence, $recurring->frequency, $recurring->frequency_value);
            }
        }

        return [
            'receitas' => $receitas,
            'despesas' => $despesas,
        ];
    }

    /**
     * Adiciona frequência a uma data
     */
    private function addFrequency(Carbon $date, string $frequency, int $value): Carbon
    {
        $copy = $date->copy();

        switch ($frequency) {
            case 'semanal':
                return $copy->addWeeks($value);
            case 'mensal':
                return $copy->addMonths($value);
            case 'anual':
                return $copy->addYears($value);
            case 'personalizada':
                return $copy->addDays($value);
            default:
                return $copy->addMonth();
        }
    }
}

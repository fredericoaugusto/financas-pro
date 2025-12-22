<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Transaction;
use App\Models\RecurringTransaction;
use App\Models\Card;
use App\Models\CardInvoice;
use App\Models\CardInstallment;
use App\Models\Account;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CalendarTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_returns_calendar_events()
    {
        $user = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id]);

        $start = now()->startOfMonth();
        $end = now()->endOfMonth();

        // 1. Transação Real (Hoje)
        Transaction::factory()->create([
            'user_id' => $user->id,
            'date' => now(),
            'description' => 'Real Transaction',
            'value' => 50,
            'account_id' => $account->id
        ]);

        // 2. Recorrência (Futuro)
        RecurringTransaction::create([
            'user_id' => $user->id,
            'description' => 'Netflix',
            'value' => 30,
            'type' => 'despesa',
            'frequency' => 'mensal',
            'frequency_value' => 1,
            'start_date' => now()->addDays(2),
            'next_occurrence' => now()->addDays(2), // Futuro próximo
            'status' => 'ativa'
        ]);

        // 3. Fatura e Parcela
        $card = Card::factory()->create(['user_id' => $user->id]);
        $invoice = CardInvoice::create([
            'card_id' => $card->id,
            'reference_month' => now()->format('Y-m'),
            'period_start' => now()->startOfMonth(),
            'period_end' => now()->endOfMonth(),
            'closing_date' => now()->addDays(4),
            'due_date' => now()->addDays(6), // Futuro próximo
            'total_value' => 200,
            'status' => 'aberta'
        ]);

        // Transação de crédito que gerou parcela
        $creditTx = Transaction::factory()->create([
            'user_id' => $user->id,
            'card_id' => $card->id,
            'payment_method' => 'credito',
            'date' => now()->startOfMonth()->addDays(5)
        ]);

        CardInstallment::create([
            'transaction_id' => $creditTx->id,
            'card_invoice_id' => $invoice->id,
            'installment_number' => 1,
            'total_installments' => 1,
            'value' => 200,
            'due_date' => $invoice->due_date,
            'status' => 'pendente'
        ]);

        $response = $this->actingAs($user)->getJson("/api/calendar?start={$start->format('Y-m-d')}&end={$end->format('Y-m-d')}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'events' => [
                    '*' => [
                        'id',
                        'type',
                        'date',
                        'description',
                        'value',
                        'status'
                    ]
                ]
            ]);

        $events = $response->json('events');


        // Verificar Transação Real
        $this->assertTrue(collect($events)->where('type', 'transaction')->isNotEmpty());

        // Verificar Recorrência
        $this->assertTrue(collect($events)->where('type', 'recurring')->isNotEmpty());

        // Verificar Fatura
        $this->assertTrue(collect($events)->where('type', 'invoice')->isNotEmpty());

        // Verificar Parcela
        $this->assertTrue(collect($events)->where('type', 'installment')->isNotEmpty());
    }
}

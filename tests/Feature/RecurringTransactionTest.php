<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Account;
use App\Models\RecurringTransaction;
use App\Services\RecurringTransactionService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RecurringTransactionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Seed basic data if needed, or create in tests
    }

    public function test_user_can_create_recurring_transaction()
    {
        $user = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->postJson('/api/recurring-transactions', [
            'description' => 'Aluguel',
            'value' => 1500.00,
            'type' => 'despesa',
            'frequency' => 'mensal',
            'frequency_value' => 1,
            'start_date' => now()->format('Y-m-d'),
            'account_id' => $account->id,
            'payment_method' => 'debito',
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['description' => 'Aluguel']);

        $this->assertDatabaseHas('recurring_transactions', [
            'user_id' => $user->id,
            'description' => 'Aluguel',
            'status' => 'ativa'
        ]);
    }

    public function test_service_generates_transaction_when_due()
    {
        $user = User::factory()->create();
        $account = Account::factory()->create(['user_id' => $user->id]);

        // Criar recorrência vencida HOJE
        $recurring = RecurringTransaction::create([
            'user_id' => $user->id,
            'description' => 'Internet',
            'value' => 100.00,
            'type' => 'despesa',
            'frequency' => 'mensal',
            'frequency_value' => 1,
            'start_date' => now()->format('Y-m-d'),
            'next_occurrence' => now()->format('Y-m-d'), // Vence hoje
            'account_id' => $account->id,
            'payment_method' => 'debito',
            'status' => 'ativa'
        ]);

        // Executar Service
        $service = new RecurringTransactionService();
        $count = $service->processDue(now());

        $this->assertEquals(1, $count);

        // Verificar se Transação foi criada
        $this->assertDatabaseHas('transactions', [
            'user_id' => $user->id,
            'description' => 'Internet',
            'value' => 100.00,
            'recurring_transaction_id' => $recurring->id
        ]);

        // Verificar se next_occurrence avançou 1 mês
        $recurring->refresh();
        $this->assertEquals(
            now()->addMonth()->format('Y-m-d'),
            $recurring->next_occurrence->format('Y-m-d')
        );
        $this->assertNotNull($recurring->last_generated_at);
    }

    public function test_service_skips_future_transactions()
    {
        $user = User::factory()->create();

        $recurring = RecurringTransaction::create([
            'user_id' => $user->id,
            'description' => 'Futuro',
            'value' => 100.00,
            'type' => 'despesa',
            'frequency' => 'mensal',
            'frequency_value' => 1,
            'start_date' => now()->addDay()->format('Y-m-d'),
            'next_occurrence' => now()->addDay()->format('Y-m-d'), // Amanhã
            'payment_method' => 'dinheiro',
            'status' => 'ativa'
        ]);

        $service = new RecurringTransactionService();
        $count = $service->processDue(now());

        $this->assertEquals(0, $count);
        $this->assertDatabaseMissing('transactions', ['description' => 'Futuro']);
    }

    public function test_service_skips_paused_transactions()
    {
        $user = User::factory()->create();

        $recurring = RecurringTransaction::create([
            'user_id' => $user->id,
            'description' => 'Pausado',
            'value' => 100.00,
            'type' => 'despesa',
            'frequency' => 'mensal',
            'frequency_value' => 1,
            'start_date' => now()->format('Y-m-d'),
            'next_occurrence' => now()->format('Y-m-d'),
            'payment_method' => 'dinheiro',
            'status' => 'pausada'
        ]);

        $service = new RecurringTransactionService();
        $count = $service->processDue(now());

        $this->assertEquals(0, $count);
    }
}

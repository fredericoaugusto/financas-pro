<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\Card;
use App\Models\Category;
use App\Models\RecurringTransaction;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class RecurringTransactionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $user = User::first();
        if (!$user) {
            $this->command->warn('Nenhum usuário encontrado. Execute UserSeeder primeiro.');
            return;
        }

        $account = Account::where('user_id', $user->id)->first();
        $card = Card::where('user_id', $user->id)->first();

        $categoryDespesa = Category::where('type', 'despesa')->first();
        $categoryReceita = Category::where('type', 'receita')->first();

        // 1. Recorrência mensal ativa (conta)
        RecurringTransaction::updateOrCreate(
            ['user_id' => $user->id, 'description' => 'Aluguel'],
            [
                'type' => 'despesa',
                'value' => 1500.00,
                'category_id' => $categoryDespesa?->id,
                'account_id' => $account?->id,
                'card_id' => null,
                'payment_method' => 'dinheiro',
                'frequency' => 'mensal',
                'frequency_value' => 1,
                'start_date' => Carbon::now()->subMonths(3)->startOfMonth(),
                'end_date' => null,
                'next_occurrence' => Carbon::now()->addMonth()->startOfMonth(),
                'last_generated_at' => Carbon::now()->startOfMonth(),
                'status' => 'ativa',
                'notes' => 'Aluguel do apartamento',
            ]
        );

        // 2. Recorrência mensal ativa (cartão)
        if ($card) {
            RecurringTransaction::updateOrCreate(
                ['user_id' => $user->id, 'description' => 'Netflix'],
                [
                    'type' => 'despesa',
                    'value' => 39.90,
                    'category_id' => $categoryDespesa?->id,
                    'account_id' => null,
                    'card_id' => $card->id,
                    'payment_method' => 'credito',
                    'frequency' => 'mensal',
                    'frequency_value' => 1,
                    'start_date' => Carbon::now()->subMonths(6),
                    'end_date' => null,
                    'next_occurrence' => Carbon::now()->addDays(10),
                    'last_generated_at' => Carbon::now()->subMonth(),
                    'status' => 'ativa',
                    'notes' => 'Assinatura streaming',
                ]
            );

            RecurringTransaction::updateOrCreate(
                ['user_id' => $user->id, 'description' => 'Spotify'],
                [
                    'type' => 'despesa',
                    'value' => 21.90,
                    'category_id' => $categoryDespesa?->id,
                    'account_id' => null,
                    'card_id' => $card->id,
                    'payment_method' => 'credito',
                    'frequency' => 'mensal',
                    'frequency_value' => 1,
                    'start_date' => Carbon::now()->subMonths(12),
                    'end_date' => null,
                    'next_occurrence' => Carbon::now()->addDays(5),
                    'last_generated_at' => Carbon::now()->subMonth(),
                    'status' => 'ativa',
                    'notes' => null,
                ]
            );
        }

        // 3. Recorrência pausada
        RecurringTransaction::updateOrCreate(
            ['user_id' => $user->id, 'description' => 'Academia'],
            [
                'type' => 'despesa',
                'value' => 99.90,
                'category_id' => $categoryDespesa?->id,
                'account_id' => $account?->id,
                'card_id' => null,
                'payment_method' => 'dinheiro',
                'frequency' => 'mensal',
                'frequency_value' => 1,
                'start_date' => Carbon::now()->subMonths(8),
                'end_date' => null,
                'next_occurrence' => Carbon::now()->addDays(15),
                'last_generated_at' => Carbon::now()->subMonth(),
                'status' => 'pausada',
                'notes' => 'Pausada temporariamente',
            ]
        );

        // 4. Recorrência encerrada
        RecurringTransaction::updateOrCreate(
            ['user_id' => $user->id, 'description' => 'Seguro Auto Antigo'],
            [
                'type' => 'despesa',
                'value' => 250.00,
                'category_id' => $categoryDespesa?->id,
                'account_id' => $account?->id,
                'card_id' => null,
                'payment_method' => 'dinheiro',
                'frequency' => 'mensal',
                'frequency_value' => 1,
                'start_date' => Carbon::now()->subMonths(24),
                'end_date' => Carbon::now()->subMonths(12),
                'next_occurrence' => Carbon::now()->subMonths(12),
                'last_generated_at' => Carbon::now()->subMonths(12),
                'status' => 'encerrada',
                'notes' => 'Contrato encerrado',
            ]
        );

        // 5. Recorrência com data de término
        RecurringTransaction::updateOrCreate(
            ['user_id' => $user->id, 'description' => 'Financiamento Carro'],
            [
                'type' => 'despesa',
                'value' => 850.00,
                'category_id' => $categoryDespesa?->id,
                'account_id' => $account?->id,
                'card_id' => null,
                'payment_method' => 'dinheiro',
                'frequency' => 'mensal',
                'frequency_value' => 1,
                'start_date' => Carbon::now()->subMonths(18),
                'end_date' => Carbon::now()->addMonths(30),
                'next_occurrence' => Carbon::now()->addDays(8),
                'last_generated_at' => Carbon::now()->subMonth(),
                'status' => 'ativa',
                'notes' => 'Financiamento 48x - restam 30 parcelas',
            ]
        );

        // 6. Recorrência semanal (receita)
        RecurringTransaction::updateOrCreate(
            ['user_id' => $user->id, 'description' => 'Freelance Semanal'],
            [
                'type' => 'receita',
                'value' => 500.00,
                'category_id' => $categoryReceita?->id,
                'account_id' => $account?->id,
                'card_id' => null,
                'payment_method' => 'dinheiro',
                'frequency' => 'semanal',
                'frequency_value' => 1,
                'start_date' => Carbon::now()->subWeeks(4),
                'end_date' => null,
                'next_occurrence' => Carbon::now()->addDays(3),
                'last_generated_at' => Carbon::now()->subWeek(),
                'status' => 'ativa',
                'notes' => 'Projeto freelance recorrente',
            ]
        );

        // 7. Receita mensal (salário)
        RecurringTransaction::updateOrCreate(
            ['user_id' => $user->id, 'description' => 'Salário'],
            [
                'type' => 'receita',
                'value' => 5000.00,
                'category_id' => $categoryReceita?->id,
                'account_id' => $account?->id,
                'card_id' => null,
                'payment_method' => 'dinheiro',
                'frequency' => 'mensal',
                'frequency_value' => 1,
                'start_date' => Carbon::now()->subMonths(12),
                'end_date' => null,
                'next_occurrence' => Carbon::now()->endOfMonth()->subDays(5),
                'last_generated_at' => Carbon::now()->subMonth()->endOfMonth()->subDays(5),
                'status' => 'ativa',
                'notes' => null,
            ]
        );

        $this->command->info('Recorrências de teste criadas com sucesso!');
    }
}

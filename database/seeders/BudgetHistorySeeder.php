<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Category;
use App\Models\Transaction;
use App\Models\Budget;
use App\Models\GeneralBudget;
use App\Models\GeneralBudgetPeriod;
use Carbon\Carbon;

class BudgetHistorySeeder extends Seeder
{
    public function run(): void
    {
        $user = User::first();
        if (!$user) {
            $this->command->error('Nenhum usuário encontrado. Crie um usuário primeiro.');
            return;
        }

        // Ensure we have some categories
        $categories = Category::where('user_id', $user->id)->get();
        if ($categories->isEmpty()) {
            $this->command->error('Nenhuma categoria encontrada. Crie categorias primeiro.');
            return;
        }

        $this->command->info('Criando dados históricos de orçamento...');

        // Create general budget if not exists
        $generalBudget = GeneralBudget::firstOrCreate([
            'user_id' => $user->id,
            'period_type' => 'monthly',
        ], [
            'name' => 'Orçamento Mensal Geral',
            'limit_value' => 5000.00,
            'start_date' => Carbon::now()->subMonths(6)->startOfMonth(),
            'status' => 'active',
            'include_future_categories' => true,
        ]);

        // Create historical periods for the past 6 months
        for ($i = 5; $i >= 0; $i--) {
            $date = Carbon::now()->subMonths($i);
            $year = $date->year;
            $month = $date->month;

            // Create period if not exists
            $period = GeneralBudgetPeriod::firstOrCreate([
                'general_budget_id' => $generalBudget->id,
                'reference_year' => $year,
                'reference_month' => $month,
            ], [
                'limit_value_snapshot' => $generalBudget->limit_value,
                'spent' => 0,
                'status' => 'ok',
            ]);

            // Create random transactions for this month
            $numTransactions = rand(5, 15);
            $totalSpent = 0;

            for ($j = 0; $j < $numTransactions; $j++) {
                $category = $categories->random();
                $value = rand(50, 800);
                $totalSpent += $value;

                $day = rand(1, min(28, $date->daysInMonth));
                $transDate = Carbon::create($year, $month, $day);

                $descriptions = [
                    'Mercado',
                    'Restaurante',
                    'Uber',
                    'Farmácia',
                    'Conta de luz',
                    'Internet',
                    'Netflix',
                    'Gasolina',
                    'Shopping',
                    'Supermercado',
                    'Padaria',
                    'Açougue',
                    'Pet Shop',
                    'Academia',
                    'Estacionamento',
                    'Cinema',
                    'Café',
                    'Livraria',
                    'Loja de roupas',
                    'Eletrônicos',
                ];

                Transaction::create([
                    'user_id' => $user->id,
                    'category_id' => $category->id,
                    'type' => 'despesa',
                    'value' => $value,
                    'description' => $descriptions[array_rand($descriptions)] . ' ' . $j,
                    'date' => $transDate,
                    'payment_method' => 'pix',
                    'affects_balance' => true,
                    'status' => 'confirmada',
                ]);
            }

            // Update period spent
            $period->recalculateSpent();
            $this->command->info("  - {$date->format('M/Y')}: {$numTransactions} transações, total R$ {$period->spent}");
        }

        // Create category budgets with history
        $selectedCategories = $categories->take(3);
        foreach ($selectedCategories as $category) {
            $budget = Budget::firstOrCreate([
                'user_id' => $user->id,
                'category_id' => $category->id,
                'reference_month' => Carbon::now()->format('Y-m'),
            ], [
                'limit_value' => rand(500, 1500),
            ]);

            // Create budgets for past months
            for ($i = 1; $i <= 5; $i++) {
                $date = Carbon::now()->subMonths($i);
                Budget::firstOrCreate([
                    'user_id' => $user->id,
                    'category_id' => $category->id,
                    'reference_month' => $date->format('Y-m'),
                ], [
                    'limit_value' => rand(500, 1500),
                ]);
            }

            $this->command->info("  - Orçamento de categoria: {$category->name}");
        }

        $this->command->info('Dados históricos criados com sucesso!');
    }
}

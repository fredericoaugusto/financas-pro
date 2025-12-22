<?php

namespace Database\Seeders;

use App\Models\Transaction;
use App\Models\User;
use Illuminate\Database\Seeder;

class SubscriptionTestSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::first();

        if (!$user) {
            $this->command->error('Nenhum usuário encontrado. Crie uma conta primeiro.');
            return;
        }

        // Netflix - 4 meses de assinatura
        for ($i = 0; $i < 4; $i++) {
            Transaction::create([
                'user_id' => $user->id,
                'description' => 'Netflix Mensal',
                'value' => 55.90,
                'type' => 'despesa',
                'date' => now()->subMonths($i)->format('Y-m-d'),
                'status' => 'confirmada',
                'payment_method' => 'credito'
            ]);
        }

        // Spotify - 3 meses
        for ($i = 0; $i < 3; $i++) {
            Transaction::create([
                'user_id' => $user->id,
                'description' => 'Spotify Premium',
                'value' => 21.90,
                'type' => 'despesa',
                'date' => now()->subMonths($i)->subDays(5)->format('Y-m-d'),
                'status' => 'confirmada',
                'payment_method' => 'debito'
            ]);
        }

        // Academia - 5 meses
        for ($i = 0; $i < 5; $i++) {
            Transaction::create([
                'user_id' => $user->id,
                'description' => 'Mensalidade Academia SmartFit',
                'value' => 89.90,
                'type' => 'despesa',
                'date' => now()->subMonths($i)->subDays(10)->format('Y-m-d'),
                'status' => 'confirmada',
                'payment_method' => 'debito'
            ]);
        }

        $this->command->info('Criadas transações de teste para detecção de assinaturas!');
        $this->command->info('- Netflix (4 meses, R$ 55,90)');
        $this->command->info('- Spotify (3 meses, R$ 21,90)');
        $this->command->info('- Academia (5 meses, R$ 89,90)');
    }
}

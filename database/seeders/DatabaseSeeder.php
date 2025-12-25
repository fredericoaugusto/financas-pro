<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Categorias padrão do sistema
        $this->call(CategorySeeder::class);

        // 2. Usuário de Teste
        User::firstOrCreate(
            ['email' => 'test@example.com'],
            ['name' => 'Usuário Teste', 'password' => bcrypt('password')]
        );

        $this->command->info('Ambiente básico restaurado com sucesso!');
    }
}

<?php

namespace App\Console\Commands;

use App\Services\RecurringTransactionService;
use Illuminate\Console\Command;

/**
 * Comando para gerar transações de recorrências
 * 
 * IMPORTANTE:
 * - Seguro para rodar múltiplas vezes (idempotente)
 * - Gera no máximo 1 transação por recorrência por execução
 * - Nunca gera retroativos
 * 
 * Uso:
 *   php artisan recurring:generate
 * 
 * Recomendado rodar via cron/scheduler diariamente
 */
class GenerateRecurringTransactions extends Command
{
    protected $signature = 'recurring:generate';

    protected $description = 'Gera transações para recorrências que devem ser geradas hoje';

    public function handle(RecurringTransactionService $service): int
    {
        $this->info('🔄 Iniciando geração de transações recorrentes...');
        $this->newLine();

        $result = $service->generateDue();

        $this->info("✅ Geradas: {$result['generated']}");
        $this->info("⏭️  Puladas: {$result['skipped']}");

        if (count($result['errors']) > 0) {
            $this->warn("⚠️  Erros: " . count($result['errors']));
            foreach ($result['errors'] as $error) {
                $this->error("   - Recorrência #{$error['recurring_id']}: {$error['error']}");
            }
        }

        $this->newLine();
        $this->info('✨ Geração de recorrências concluída!');

        return count($result['errors']) > 0 ? self::FAILURE : self::SUCCESS;
    }
}

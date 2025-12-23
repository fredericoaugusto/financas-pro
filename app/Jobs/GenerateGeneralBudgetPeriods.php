<?php

namespace App\Jobs;

use App\Services\GeneralBudgetService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class GenerateGeneralBudgetPeriods implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Execute the job.
     * Generate current month/year periods for all active general budgets.
     */
    public function handle(GeneralBudgetService $service): void
    {
        try {
            $generated = $service->generateCurrentPeriods();

            if (count($generated) > 0) {
                Log::info('GenerateGeneralBudgetPeriods: Created ' . count($generated) . ' new periods');
            }
        } catch (\Exception $e) {
            Log::error('GenerateGeneralBudgetPeriods: Error - ' . $e->getMessage());
        }
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\FinancialInsightsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FinancialInsightsController extends Controller
{
    protected $service;

    public function __construct(FinancialInsightsService $service)
    {
        $this->service = $service;
    }

    /**
     * Get a summary of financial insights including score and top highlights.
     */
    public function summary(): JsonResponse
    {
        try {
            $summary = $this->service->getSummary();

            // Limit lists for summary if needed, but for now returning full structure 
            // allows frontend to decide what to show in "Smart Summary".
            // Maybe we slice anomalies/trends here to top 5?
            $summary['anomalies'] = collect($summary['anomalies'])->take(5)->values();
            $summary['trends'] = collect($summary['trends'])->take(5)->values();

            return response()->json([
                'data' => $summary
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Erro ao carregar insights',
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ], 500);
        }
    }

    /**
     * Get detailed trends analysis.
     */
    public function trends(): JsonResponse
    {
        $trends = $this->service->analyzeTrends();
        return response()->json([
            'data' => $trends
        ]);
    }

    /**
     * Get detailed score analysis.
     */
    public function score(): JsonResponse
    {
        $score = $this->service->calculateScore();
        return response()->json([
            'data' => $score
        ]);
    }
}

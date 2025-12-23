<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GeneralBudget;
use App\Services\GeneralBudgetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class GeneralBudgetController extends Controller
{
    public function __construct(
        private GeneralBudgetService $service
    ) {
    }

    /**
     * List general budgets for user.
     */
    public function index(Request $request): JsonResponse
    {
        $query = GeneralBudget::where('user_id', Auth::id())
            ->with('periods');

        // Filter by status
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $budgets = $query->orderBy('created_at', 'desc')->get();

        // Add current period info
        $budgets->each(function ($budget) {
            if ($budget->status === 'active') {
                $budget->ensureCurrentPeriod();
            }
        });

        return response()->json([
            'data' => $budgets,
        ]);
    }

    /**
     * Create a general budget.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'limit_value' => ['required', 'numeric', 'min:0.01'],
            'period_type' => ['required', 'in:monthly,yearly'],
            'include_future_categories' => ['sometimes', 'boolean'],
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['exists:categories,id'],
        ]);

        // Check for existing active budget of same type
        $existing = GeneralBudget::where('user_id', Auth::id())
            ->where('period_type', $validated['period_type'])
            ->where('status', 'active')
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'Já existe um orçamento geral ativo desse tipo. Pause ou encerre o anterior primeiro.',
            ], 422);
        }

        $budget = GeneralBudget::create([
            'user_id' => Auth::id(),
            'name' => $validated['name'] ?? 'Orçamento Geral',
            'limit_value' => $validated['limit_value'],
            'period_type' => $validated['period_type'],
            'start_date' => now()->startOfMonth(),
            'status' => 'active',
            'include_future_categories' => $validated['include_future_categories'] ?? true,
            'category_ids' => $validated['category_ids'] ?? null,
        ]);

        // Create the first period immediately
        $budget->ensureCurrentPeriod();

        return response()->json([
            'message' => 'Orçamento geral criado com sucesso!',
            'data' => $budget->load('periods'),
        ], 201);
    }

    /**
     * Show a general budget.
     */
    public function show(GeneralBudget $generalBudget): JsonResponse
    {
        if ($generalBudget->user_id !== Auth::id()) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        $generalBudget->load('periods');
        if ($generalBudget->status === 'active') {
            $generalBudget->ensureCurrentPeriod();
        }

        return response()->json([
            'data' => $generalBudget,
        ]);
    }

    /**
     * Update a general budget.
     */
    public function update(Request $request, GeneralBudget $generalBudget): JsonResponse
    {
        if ($generalBudget->user_id !== Auth::id()) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'limit_value' => ['sometimes', 'numeric', 'min:0.01'],
            'include_future_categories' => ['sometimes', 'boolean'],
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['exists:categories,id'],
        ]);

        $generalBudget->update($validated);

        // If limit changed, update current period snapshot
        if (isset($validated['limit_value'])) {
            $currentPeriod = $generalBudget->currentPeriod;
            if ($currentPeriod) {
                $currentPeriod->limit_value_snapshot = $validated['limit_value'];
                $currentPeriod->recalculateSpent();
                $this->service->checkThresholds($currentPeriod);
            }
        }

        return response()->json([
            'message' => 'Orçamento geral atualizado!',
            'data' => $generalBudget->fresh()->load('periods'),
        ]);
    }

    /**
     * Delete a general budget.
     */
    public function destroy(GeneralBudget $generalBudget): JsonResponse
    {
        if ($generalBudget->user_id !== Auth::id()) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        $generalBudget->delete();

        return response()->json([
            'message' => 'Orçamento geral removido.',
        ]);
    }

    /**
     * Get current active budget with period.
     */
    public function current(): JsonResponse
    {
        $monthlyBudget = GeneralBudget::where('user_id', Auth::id())
            ->where('period_type', 'monthly')
            ->where('status', 'active')
            ->first();

        $yearlyBudget = GeneralBudget::where('user_id', Auth::id())
            ->where('period_type', 'yearly')
            ->where('status', 'active')
            ->first();

        // Ensure current periods exist
        if ($monthlyBudget) {
            $monthlyBudget->ensureCurrentPeriod();
            $monthlyBudget->load('periods');
        }
        if ($yearlyBudget) {
            $yearlyBudget->ensureCurrentPeriod();
            $yearlyBudget->load('periods');
        }

        return response()->json([
            'data' => [
                'monthly' => $monthlyBudget,
                'yearly' => $yearlyBudget,
            ],
        ]);
    }

    /**
     * Pause a budget.
     */
    public function pause(GeneralBudget $generalBudget): JsonResponse
    {
        if ($generalBudget->user_id !== Auth::id()) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        if ($generalBudget->status !== 'active') {
            return response()->json(['message' => 'Apenas orçamentos ativos podem ser pausados.'], 422);
        }

        $generalBudget->pause();

        return response()->json([
            'message' => 'Orçamento pausado.',
            'data' => $generalBudget->fresh(),
        ]);
    }

    /**
     * Resume a paused budget.
     */
    public function resume(GeneralBudget $generalBudget): JsonResponse
    {
        if ($generalBudget->user_id !== Auth::id()) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        if ($generalBudget->status !== 'paused') {
            return response()->json(['message' => 'Apenas orçamentos pausados podem ser retomados.'], 422);
        }

        $generalBudget->resume();

        return response()->json([
            'message' => 'Orçamento retomado.',
            'data' => $generalBudget->fresh()->load('periods'),
        ]);
    }

    /**
     * End a budget permanently.
     */
    public function end(GeneralBudget $generalBudget): JsonResponse
    {
        if ($generalBudget->user_id !== Auth::id()) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        if ($generalBudget->status === 'ended') {
            return response()->json(['message' => 'Orçamento já encerrado.'], 422);
        }

        $generalBudget->end();

        return response()->json([
            'message' => 'Orçamento encerrado.',
            'data' => $generalBudget->fresh(),
        ]);
    }
}

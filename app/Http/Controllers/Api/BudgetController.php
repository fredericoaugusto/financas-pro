<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Budget;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;

class BudgetController extends Controller
{
    /**
     * Lista orçamentos do período (mensal ou anual)
     */
    public function index(Request $request): JsonResponse
    {
        $period = $request->get('period', Carbon::today()->format('Y-m'));
        $periodType = $request->get('period_type', 'mensal');

        $budgets = Budget::where('user_id', $request->user()->id)
            ->where('reference_month', $period)
            ->where('period_type', $periodType)
            ->with('category')
            ->get();

        return response()->json([
            'data' => $budgets,
            'period' => $period,
            'period_type' => $periodType,
        ]);
    }

    /**
     * Criar orçamento
     */
    public function store(Request $request): JsonResponse
    {
        $periodType = $request->input('period_type', 'mensal');

        $rules = [
            'category_id' => ['required', 'exists:categories,id'],
            'limit_value' => ['required', 'numeric', 'min:0.01'],
            'period_type' => ['sometimes', 'in:mensal,anual'],
        ];

        // Validação diferente para mensal vs anual
        if ($periodType === 'anual') {
            $rules['reference_month'] = ['required', 'regex:/^\d{4}$/'];
        } else {
            $rules['reference_month'] = ['required', 'regex:/^\d{4}-\d{2}$/'];
        }

        $validated = $request->validate($rules, [
            'category_id.required' => 'Selecione uma categoria.',
            'reference_month.required' => 'O período é obrigatório.',
            'reference_month.regex' => $periodType === 'anual'
                ? 'Formato de ano inválido (use YYYY).'
                : 'Formato de mês inválido (use YYYY-MM).',
            'limit_value.required' => 'O valor limite é obrigatório.',
            'limit_value.min' => 'O valor deve ser maior que zero.',
        ]);

        // Verificar se já existe orçamento para esta categoria/período
        $existing = Budget::where('user_id', $request->user()->id)
            ->where('category_id', $validated['category_id'])
            ->where('reference_month', $validated['reference_month'])
            ->where('period_type', $periodType)
            ->first();

        if ($existing) {
            $periodLabel = $periodType === 'anual' ? 'ano' : 'mês';
            return response()->json([
                'message' => "Já existe um orçamento para esta categoria neste {$periodLabel}.",
            ], 422);
        }

        $budget = Budget::create([
            'user_id' => $request->user()->id,
            'period_type' => $periodType,
            ...$validated,
        ]);

        AuditLog::log('create', 'Budget', $budget->id, [
            'category_id' => $budget->category_id,
            'limit_value' => $budget->limit_value,
            'period_type' => $budget->period_type,
        ]);

        return response()->json([
            'message' => 'Orçamento criado com sucesso!',
            'data' => $budget->load('category'),
        ], 201);
    }

    /**
     * Atualizar orçamento
     */
    public function update(Request $request, Budget $budget): JsonResponse
    {
        if ($budget->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        $validated = $request->validate([
            'limit_value' => ['required', 'numeric', 'min:0.01'],
        ]);

        $budget->update($validated);

        AuditLog::log('update', 'Budget', $budget->id, [
            'limit_value' => $budget->limit_value,
        ]);

        return response()->json([
            'message' => 'Orçamento atualizado!',
            'data' => $budget->fresh('category'),
        ]);
    }

    /**
     * Excluir orçamento
     */
    public function destroy(Request $request, Budget $budget): JsonResponse
    {
        if ($budget->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        AuditLog::log('delete', 'Budget', $budget->id);

        $budget->delete();

        return response()->json([
            'message' => 'Orçamento removido!',
        ]);
    }

    /**
     * Resumo de orçamentos do período
     * Retorna lista com categoria, limite, consumido, percentual, status
     */
    public function summary(Request $request): JsonResponse
    {
        $period = $request->get('period', Carbon::today()->format('Y-m'));
        $periodType = $request->get('period_type', 'mensal');

        $budgets = Budget::where('user_id', $request->user()->id)
            ->where('reference_month', $period)
            ->where('period_type', $periodType)
            ->with('category')
            ->get()
            ->map(function ($budget) {
                return [
                    'id' => $budget->id,
                    'category' => $budget->category,
                    'category_id' => $budget->category_id,
                    'limit_value' => $budget->limit_value,
                    'consumed_value' => $budget->consumed_value,
                    'remaining_value' => $budget->remaining_value,
                    'usage_percentage' => $budget->usage_percentage,
                    'status' => $budget->status,
                    'period_type' => $budget->period_type,
                ];
            });

        // Calcular totais
        $totalLimit = $budgets->sum('limit_value');
        $totalConsumed = $budgets->sum('consumed_value');

        return response()->json([
            'data' => $budgets,
            'period' => $period,
            'period_type' => $periodType,
            'totals' => [
                'limit' => $totalLimit,
                'consumed' => $totalConsumed,
                'remaining' => $totalLimit - $totalConsumed,
                'percentage' => $totalLimit > 0 ? round(($totalConsumed / $totalLimit) * 100, 1) : 0,
            ],
        ]);
    }
}

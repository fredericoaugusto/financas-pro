<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Transaction;
use App\Services\ImportDetectionService;
use App\Services\OfxParserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ImportController extends Controller
{
    public function __construct(
        private OfxParserService $ofxParser,
        private ImportDetectionService $detectionService
    ) {
    }

    /**
     * Parse an uploaded OFX file and return analyzed transactions.
     */
    public function parse(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|max:10240', // Max 10MB
        ]);

        $file = $request->file('file');

        // Validate file extension
        $extension = strtolower($file->getClientOriginalExtension());
        if (!in_array($extension, ['ofx', 'qfx'])) {
            return response()->json([
                'message' => 'Formato inválido. Apenas arquivos OFX e QFX são suportados.',
            ], 422);
        }

        try {
            // Parse the OFX file
            $parsed = $this->ofxParser->parse($file);

            if (empty($parsed['transactions'])) {
                return response()->json([
                    'message' => 'Nenhuma transação encontrada no arquivo.',
                    'account_info' => $parsed['account_info'],
                    'transactions' => [],
                ], 200);
            }

            // Analyze for duplicates, categories, etc.
            $analyzed = $this->detectionService->analyze(
                $parsed['transactions'],
                auth()->id()
            );

            // Get statistics
            $stats = $this->getStats($analyzed);

            return response()->json([
                'message' => 'Arquivo processado com sucesso.',
                'account_info' => $parsed['account_info'],
                'transactions' => $analyzed,
                'stats' => $stats,
                'categories' => $this->detectionService->getKnownCategories(),
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erro ao processar arquivo: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Confirm and import selected transactions.
     */
    public function confirm(Request $request): JsonResponse
    {
        $request->validate([
            'transactions' => 'required|array|min:1',
            'transactions.*.date' => 'required|date',
            'transactions.*.description' => 'required|string|max:255',
            'transactions.*.amount' => 'required|numeric',
            'transactions.*.type' => 'required|in:receita,despesa',
            'transactions.*.category' => 'nullable|string|max:50',
            'transactions.*.account_id' => 'nullable|exists:accounts,id',
            'transactions.*.hash' => 'required|string|size:32',
            'transactions.*.hash_version' => 'required|integer',
            'transactions.*.status' => 'nullable|in:confirmada,pendente',
        ]);

        $userId = auth()->id();
        $created = [];
        $skipped = [];

        DB::beginTransaction();

        try {
            foreach ($request->transactions as $txData) {
                // Double-check for duplicates before inserting
                $existingHash = Transaction::where('user_id', $userId)
                    ->where('import_hash', $txData['hash'])
                    ->exists();

                if ($existingHash) {
                    $skipped[] = $txData['description'];
                    continue;
                }

                $transaction = Transaction::create([
                    'user_id' => $userId,
                    'account_id' => $txData['account_id'] ?? null,
                    'description' => $txData['description'],
                    'value' => abs($txData['amount']),
                    'type' => $txData['type'],
                    'date' => $txData['date'],
                    'category' => $txData['category'] ?? null,
                    'status' => $txData['status'] ?? 'confirmada',
                    'payment_method' => 'importado',
                    'notes' => 'Importado via OFX',
                    'import_hash' => $txData['hash'],
                    'import_hash_version' => $txData['hash_version'],
                ]);

                $created[] = $transaction->id;
            }

            // Log the import action
            AuditLog::log(
                'import_transactions',
                'Transaction',
                null,
                [
                    'total_imported' => count($created),
                    'total_skipped' => count($skipped),
                    'transaction_ids' => $created,
                ],
                $userId
            );

            DB::commit();

            return response()->json([
                'message' => 'Importação concluída com sucesso.',
                'imported' => count($created),
                'skipped' => count($skipped),
                'skipped_descriptions' => $skipped,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Erro ao importar transações: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get statistics from analyzed transactions.
     */
    private function getStats(array $analyzed): array
    {
        $stats = [
            'total' => count($analyzed),
            'new' => 0,
            'duplicate' => 0,
            'possible_duplicate' => 0,
            'transfer' => 0,
            'total_income' => 0,
            'total_expense' => 0,
        ];

        foreach ($analyzed as $item) {
            $stats[$item['technical_status']]++;

            $amount = $item['original']['amount'] ?? 0;
            if ($amount > 0) {
                $stats['total_income'] += $amount;
            } else {
                $stats['total_expense'] += abs($amount);
            }
        }

        return $stats;
    }
}

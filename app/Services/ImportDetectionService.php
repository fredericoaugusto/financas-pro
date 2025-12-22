<?php

namespace App\Services;

use App\Models\Transaction;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class ImportDetectionService
{
    /**
     * Status Técnicos (para lógica de negócio)
     */
    public const STATUS_NEW = 'new';
    public const STATUS_DUPLICATE = 'duplicate';
    public const STATUS_POSSIBLE_DUPLICATE = 'possible_duplicate';
    public const STATUS_TRANSFER = 'transfer';

    /**
     * Status Visuais (para UI)
     */
    public const UI_GREEN = 'green';
    public const UI_YELLOW = 'yellow';
    public const UI_RED = 'red';
    public const UI_BLUE = 'blue'; // For transfers

    /**
     * Known patterns for automatic categorization
     */
    private array $knownPatterns = [
        'assinaturas' => ['netflix', 'spotify', 'amazon prime', 'disney', 'hbo', 'globoplay', 'deezer', 'youtube', 'apple music', 'canva', 'chatgpt', 'openai'],
        'alimentacao' => ['ifood', 'rappi', 'uber eats', 'zé delivery', 'restaurante', 'lanchonete', 'padaria', 'supermercado', 'mercado', 'pao de acucar', 'extra', 'carrefour'],
        'transporte' => ['uber', '99', 'cabify', 'posto', 'shell', 'ipiranga', 'br ', 'estacionamento', 'zona azul'],
        'saude' => ['farmacia', 'drogaria', 'drogasil', 'panvel', 'hospital', 'clinica', 'laboratorio', 'unimed', 'sulamerica', 'amil'],
        'educacao' => ['udemy', 'alura', 'coursera', 'escola', 'faculdade', 'universidade', 'livro', 'livraria'],
        'lazer' => ['cinema', 'teatro', 'show', 'ingresso', 'steam', 'playstation', 'xbox', 'nintendo'],
        'moradia' => ['aluguel', 'condominio', 'iptu', 'luz', 'energia', 'agua', 'gas', 'internet', 'telefone', 'vivo', 'claro', 'tim', 'oi'],
        'compras' => ['amazon', 'mercado livre', 'magalu', 'magazine luiza', 'americanas', 'casas bahia', 'shopee', 'aliexpress'],
        'servicos' => ['banco', 'tarifa', 'anuidade', 'seguro', 'iof'],
        'pix' => ['pix'],
        'transferencia' => ['ted', 'doc', 'transferencia', 'transf'],
    ];

    /**
     * Analyze parsed transactions and detect duplicates, categories, and transfers.
     *
     * @param array $parsedTransactions Transactions from OfxParserService
     * @param int $userId Current user ID
     * @return array Analyzed transactions with status and suggestions
     */
    public function analyze(array $parsedTransactions, int $userId): array
    {
        $existingHashes = $this->getExistingHashes($userId);
        $result = [];

        foreach ($parsedTransactions as $index => $transaction) {
            $technicalStatus = $this->detectDuplicateStatus($transaction, $existingHashes);
            $duplicateOf = null;

            if ($technicalStatus === self::STATUS_DUPLICATE) {
                $duplicateOf = $existingHashes[$transaction['hash']] ?? null;
            }

            // Detect possible transfer (matching opposite amount within ±2 days)
            $transferMatch = $this->detectTransfer($transaction, $parsedTransactions, $index);

            // If it's a transfer, update status
            if ($transferMatch !== null && $technicalStatus === self::STATUS_NEW) {
                $technicalStatus = self::STATUS_TRANSFER;
            }

            $result[] = [
                'index' => $index,
                'original' => $transaction,
                'technical_status' => $technicalStatus,
                'ui_status' => $this->getUiStatus($technicalStatus),
                'suggested_category' => $this->suggestCategory($transaction['description']),
                'duplicate_of' => $duplicateOf,
                'transfer_match_index' => $transferMatch,
                'selected' => $technicalStatus === self::STATUS_NEW, // Pre-select new items
            ];
        }

        return $result;
    }

    /**
     * Get existing transaction hashes for the user.
     */
    private function getExistingHashes(int $userId): array
    {
        return Transaction::where('user_id', $userId)
            ->whereNotNull('import_hash')
            ->pluck('id', 'import_hash')
            ->toArray();
    }

    /**
     * Detect if a transaction is a duplicate.
     */
    private function detectDuplicateStatus(array $transaction, array $existingHashes): string
    {
        // Exact hash match = definite duplicate
        if (isset($existingHashes[$transaction['hash']])) {
            return self::STATUS_DUPLICATE;
        }

        // TODO: Implement fuzzy matching for possible duplicates
        // For MVP, we only check exact hash matches

        return self::STATUS_NEW;
    }

    /**
     * Detect if a transaction is likely a transfer (matching opposite amount).
     */
    private function detectTransfer(array $transaction, array $allTransactions, int $currentIndex): ?int
    {
        $transactionDate = strtotime($transaction['date']);
        $targetAmount = -$transaction['amount']; // Looking for opposite sign

        foreach ($allTransactions as $index => $other) {
            if ($index === $currentIndex) {
                continue;
            }

            // Check if amounts match (opposite signs)
            if (abs($other['amount'] - $targetAmount) < 0.01) {
                $otherDate = strtotime($other['date']);
                $daysDiff = abs(($transactionDate - $otherDate) / 86400);

                // Within 2 days
                if ($daysDiff <= 2) {
                    return $index;
                }
            }
        }

        return null;
    }

    /**
     * Map technical status to UI status.
     */
    private function getUiStatus(string $technicalStatus): string
    {
        return match ($technicalStatus) {
            self::STATUS_NEW => self::UI_GREEN,
            self::STATUS_DUPLICATE => self::UI_RED,
            self::STATUS_POSSIBLE_DUPLICATE => self::UI_YELLOW,
            self::STATUS_TRANSFER => self::UI_BLUE,
            default => self::UI_GREEN,
        };
    }

    /**
     * Suggest a category based on description patterns.
     */
    private function suggestCategory(string $description): ?string
    {
        $lowerDescription = Str::lower($description);

        foreach ($this->knownPatterns as $category => $patterns) {
            foreach ($patterns as $pattern) {
                if (Str::contains($lowerDescription, $pattern)) {
                    return $category;
                }
            }
        }

        return null;
    }

    /**
     * Get all known categories for UI display.
     */
    public function getKnownCategories(): array
    {
        return array_keys($this->knownPatterns);
    }
}

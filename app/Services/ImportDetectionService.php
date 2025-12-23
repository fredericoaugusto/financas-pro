<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Card;
use App\Models\Category;
use App\Models\Transaction;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class ImportDetectionService
{
    public const STATUS_NEW = 'new';
    public const STATUS_DUPLICATE = 'duplicate';
    public const STATUS_POSSIBLE_DUPLICATE = 'possible_duplicate';
    public const STATUS_TRANSFER = 'transfer';

    public const UI_GREEN = 'green';
    public const UI_YELLOW = 'yellow';
    public const UI_RED = 'red';
    public const UI_BLUE = 'blue';

    // Payment methods valid for OFX bank statement import (no credit card here)
    private array $paymentMethodPatterns = [
        'pix' => ['pix', 'chave pix', 'pix recebido', 'pix enviado'],
        'debit' => ['débito', 'debito', 'via débito', 'via debito', 'compra no débito', 'compra débito', 'nu pay', 'nupay', 'pagamento de fatura'],
    ];

    // Patterns for matching category names in database
    private array $categoryPatterns = [
        'alimentação' => ['ifood', 'rappi', 'uber eats', 'zé delivery', 'restaurante', 'lanchonete', 'padaria', 'mercado', 'supermercado'],
        'assinaturas' => ['netflix', 'spotify', 'amazon prime', 'disney', 'hbo', 'globoplay', 'deezer', 'youtube premium', 'apple music', 'canva', 'chatgpt', 'openai'],
        'transporte' => ['uber', '99', 'cabify', 'posto', 'shell', 'ipiranga', 'br distribuidora', 'estacionamento', 'combustível'],
        'saúde' => ['farmacia', 'drogaria', 'drogasil', 'panvel', 'hospital', 'clinica', 'laboratorio', 'farmácia'],
        'educação' => ['udemy', 'alura', 'coursera', 'escola', 'faculdade', 'mensalidade escolar'],
        'lazer' => ['cinema', 'teatro', 'show', 'ingresso', 'steam', 'playstation', 'xbox'],
        'moradia' => ['aluguel', 'condominio', 'iptu', 'luz', 'energia', 'cemig', 'copel', 'eletropaulo', 'água', 'sabesp', 'gas', 'internet', 'telefone'],
        'compras' => ['amazon', 'mercado livre', 'magalu', 'magazine luiza', 'americanas', 'casas bahia', 'shopee', 'aliexpress', 'shein'],
    ];

    private array $cardPatterns = [
        'nubank' => ['nubank', 'nu pay', 'nuconta'],
        'itau' => ['itau', 'itaú', 'itaucard'],
        'bradesco' => ['bradesco', 'bradescard'],
        'santander' => ['santander'],
        'bb' => ['banco do brasil', 'ourocard'],
        'caixa' => ['caixa', 'caixa economica'],
        'inter' => ['banco inter', 'inter'],
        'c6' => ['c6 bank', 'c6'],
    ];

    private Collection $userAccounts;
    private Collection $userCards;
    private Collection $userCategories;
    private int $userId;

    public function analyze(array $parsedTransactions, int $userId, ?array $accountInfo = null): array
    {
        $this->userId = $userId;
        $this->userAccounts = Account::where('user_id', $userId)->get();
        $this->userCards = Card::where('user_id', $userId)->get();
        $this->userCategories = Category::where('user_id', $userId)->orWhereNull('user_id')->get();

        $existingHashes = $this->getExistingHashes($userId);
        $result = [];
        $suggestedAccountId = $this->matchAccount($accountInfo);

        foreach ($parsedTransactions as $index => $transaction) {
            $technicalStatus = $this->detectDuplicateStatus($transaction, $existingHashes);
            $duplicateOf = null;

            if ($technicalStatus === self::STATUS_DUPLICATE) {
                $duplicateOf = $existingHashes[$transaction['hash']] ?? null;
            }

            $transferMatch = $this->detectTransfer($transaction, $parsedTransactions, $index);
            if ($transferMatch !== null && $technicalStatus === self::STATUS_NEW) {
                $technicalStatus = self::STATUS_TRANSFER;
            }

            $paymentMethod = $this->detectPaymentMethod($transaction['original_description']);
            $categoryId = $this->detectCategory($transaction['original_description'], $paymentMethod);
            $cardId = $this->detectCard($transaction['original_description'], $paymentMethod);
            $transactionType = $this->inferTransactionType($transaction, $technicalStatus);

            $result[] = [
                'index' => $index,
                'original' => $transaction,
                'technical_status' => $technicalStatus,
                'ui_status' => $this->getUiStatus($technicalStatus),
                'suggested_account_id' => $suggestedAccountId,
                'suggested_type' => $transactionType,
                'suggested_payment_method' => $paymentMethod,
                'suggested_card_id' => $cardId,
                'suggested_category_id' => $categoryId,
                'duplicate_of' => $duplicateOf,
                'transfer_match_index' => $transferMatch,
                'selected' => $technicalStatus === self::STATUS_NEW,
            ];
        }

        return $result;
    }

    private function matchAccount(?array $accountInfo): ?int
    {
        if (!$accountInfo || empty($accountInfo['account_number'])) {
            return $this->userAccounts->first()?->id;
        }

        $accountNumber = $accountInfo['account_number'];
        $bankId = $accountInfo['bank_id'] ?? '';

        $match = $this->userAccounts->first(function ($account) use ($accountNumber) {
            return Str::contains($account->account_number ?? '', $accountNumber) ||
                Str::contains($accountNumber, $account->account_number ?? '');
        });

        if ($match)
            return $match->id;

        if ($bankId) {
            $bankNames = [
                '001' => 'banco do brasil',
                '033' => 'santander',
                '104' => 'caixa',
                '237' => 'bradesco',
                '341' => 'itau',
                '260' => 'nubank',
                '077' => 'inter',
            ];
            $bankName = $bankNames[$bankId] ?? '';
            if ($bankName) {
                $match = $this->userAccounts->first(fn($a) => Str::contains(Str::lower($a->name), $bankName));
                if ($match)
                    return $match->id;
            }
        }

        return $this->userAccounts->first()?->id;
    }

    private function detectPaymentMethod(string $description): ?string
    {
        $lower = Str::lower($description);
        foreach ($this->paymentMethodPatterns as $method => $patterns) {
            foreach ($patterns as $pattern) {
                if (Str::contains($lower, $pattern))
                    return $method;
            }
        }
        return null;
    }

    private function detectCategory(string $description, ?string $paymentMethod): ?int
    {
        $lower = Str::lower($description);

        // Don't suggest category for pagamento de fatura (it's a payment, not a purchase)
        if (Str::contains($lower, 'pagamento de fatura')) {
            return null;
        }

        // For PIX, only suggest if we have a high-confidence match
        if ($paymentMethod === 'pix') {
            foreach ($this->categoryPatterns as $categoryName => $patterns) {
                foreach ($patterns as $pattern) {
                    if (Str::contains($lower, $pattern)) {
                        return $this->findCategoryIdByName($categoryName);
                    }
                }
            }
            return null; // No category for generic PIX
        }

        // For debit, try to match patterns
        foreach ($this->categoryPatterns as $categoryName => $patterns) {
            foreach ($patterns as $pattern) {
                if (Str::contains($lower, $pattern)) {
                    return $this->findCategoryIdByName($categoryName);
                }
            }
        }
        return null;
    }

    private function findCategoryIdByName(string $name): ?int
    {
        $category = $this->userCategories->first(function ($cat) use ($name) {
            return Str::contains(Str::lower($cat->name), $name);
        });
        return $category?->id;
    }

    private function detectCard(string $description, ?string $paymentMethod): ?int
    {
        // In OFX context, only debit cards are relevant (no credit card transactions)
        if ($paymentMethod !== 'debit') {
            return null;
        }

        $lower = Str::lower($description);
        foreach ($this->cardPatterns as $brand => $patterns) {
            foreach ($patterns as $pattern) {
                if (Str::contains($lower, $pattern)) {
                    $card = $this->userCards->first(
                        fn($c) =>
                        Str::contains(Str::lower($c->name), $brand) ||
                        Str::contains(Str::lower($c->brand ?? ''), $brand)
                    );
                    if ($card)
                        return $card->id;
                }
            }
        }
        return null;
    }

    private function inferTransactionType(array $transaction, string $technicalStatus): string
    {
        if ($technicalStatus === self::STATUS_TRANSFER)
            return 'transferencia';

        $description = Str::lower($transaction['original_description']);
        $amount = $transaction['amount'];

        $incomePatterns = ['recebido', 'recebida', 'credito em conta', 'deposito', 'salario', 'reembolso', 'estorno'];
        $expensePatterns = ['enviado', 'enviada', 'debito em conta', 'pagamento', 'compra', 'tarifa', 'anuidade'];

        foreach ($incomePatterns as $pattern) {
            if (Str::contains($description, $pattern))
                return 'receita';
        }
        foreach ($expensePatterns as $pattern) {
            if (Str::contains($description, $pattern))
                return 'despesa';
        }

        return $amount >= 0 ? 'receita' : 'despesa';
    }

    private function getExistingHashes(int $userId): array
    {
        return Transaction::where('user_id', $userId)
            ->whereNotNull('import_hash')
            ->pluck('id', 'import_hash')
            ->toArray();
    }

    private function detectDuplicateStatus(array $transaction, array $existingHashes): string
    {
        return isset($existingHashes[$transaction['hash']]) ? self::STATUS_DUPLICATE : self::STATUS_NEW;
    }

    private function detectTransfer(array $transaction, array $allTransactions, int $currentIndex): ?int
    {
        $transactionDate = strtotime($transaction['date']);
        $targetAmount = -$transaction['amount'];

        foreach ($allTransactions as $index => $other) {
            if ($index === $currentIndex)
                continue;
            if (abs($other['amount'] - $targetAmount) < 0.01) {
                $otherDate = strtotime($other['date']);
                if (abs(($transactionDate - $otherDate) / 86400) <= 2) {
                    return $index;
                }
            }
        }
        return null;
    }

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
     * Get available payment methods for OFX import context.
     * Only PIX and Débito make sense for bank statements.
     */
    public function getAvailablePaymentMethods(): array
    {
        return [
            'pix' => 'PIX',
            'debit' => 'Débito',
        ];
    }
}

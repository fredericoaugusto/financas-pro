<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

class OfxParserService
{
    private const HASH_VERSION = 1;

    /**
     * Parse an OFX file and return normalized transaction data.
     * Supports both XML-based OFX and SGML-based OFX (common in Brazilian banks).
     */
    public function parse(UploadedFile $file): array
    {
        $content = file_get_contents($file->getPathname());

        // Convert SGML to XML
        $xml = $this->convertToXml($content);

        $result = [
            'account_info' => null,
            'transactions' => [],
        ];

        // Parse the XML
        libxml_use_internal_errors(true);
        $doc = simplexml_load_string($xml);

        if ($doc === false) {
            // If XML parsing fails, try manual parsing
            $result = $this->parseManually($content);
            if (!empty($result['transactions'])) {
                return $result;
            }

            $errors = libxml_get_errors();
            libxml_clear_errors();
            throw new \Exception('Failed to parse OFX: ' . json_encode($errors));
        }

        // Navigate to bank transactions
        $bankMsgs = $doc->BANKMSGSRSV1 ?? null;
        $ccMsgs = $doc->CREDITCARDMSGSRSV1 ?? null;

        if ($bankMsgs) {
            $result = $this->parseBankStatement($bankMsgs, $result);
        }

        if ($ccMsgs) {
            $result = $this->parseCreditCardStatement($ccMsgs, $result);
        }

        return $result;
    }

    /**
     * Manual parsing for stubborn OFX files that resist XML conversion.
     */
    private function parseManually(string $content): array
    {
        $result = [
            'account_info' => null,
            'transactions' => [],
        ];

        // Extract account info
        if (preg_match('/<ACCTID>([^<\n]+)/i', $content, $matches)) {
            $result['account_info'] = [
                'account_number' => trim($matches[1]),
                'account_type' => 'CHECKING',
            ];
        }

        // Find all STMTTRN blocks
        preg_match_all('/<STMTTRN>(.*?)<\/STMTTRN>/is', $content, $trnMatches);

        // If no closing tags, try to find transactions without them
        if (empty($trnMatches[1])) {
            // Split by STMTTRN tags
            $parts = preg_split('/<STMTTRN>/i', $content);
            array_shift($parts); // Remove first empty part

            foreach ($parts as $part) {
                // Find where the transaction ends (at next tag or end)
                $endPos = strpos($part, '</STMTTRN>');
                if ($endPos === false) {
                    // Look for next major tag that signals end of transaction
                    $endPos = strpos($part, '<STMTTRN>');
                    if ($endPos === false) {
                        $endPos = strpos($part, '</BANKTRANLIST>');
                        if ($endPos === false) {
                            $endPos = strlen($part);
                        }
                    }
                }

                $trnContent = substr($part, 0, $endPos);
                $transaction = $this->extractTransactionFields($trnContent);

                if ($transaction) {
                    $result['transactions'][] = $transaction;
                }
            }
        } else {
            foreach ($trnMatches[1] as $trnContent) {
                $transaction = $this->extractTransactionFields($trnContent);
                if ($transaction) {
                    $result['transactions'][] = $transaction;
                }
            }
        }

        return $result;
    }

    /**
     * Extract transaction fields from a STMTTRN block content.
     */
    private function extractTransactionFields(string $content): ?array
    {
        $date = '';
        $amount = 0;
        $description = '';
        $fitid = '';
        $trntype = '';

        // Extract DTPOSTED
        if (preg_match('/<DTPOSTED>([^<\n]+)/i', $content, $m)) {
            $date = $this->parseOfxDate(trim($m[1]));
        }

        // Extract TRNAMT
        if (preg_match('/<TRNAMT>([^<\n]+)/i', $content, $m)) {
            $amount = (float) str_replace(',', '.', trim($m[1]));
        }

        // Extract NAME or MEMO
        if (preg_match('/<NAME>([^<\n]+)/i', $content, $m)) {
            $description = trim($m[1]);
        } elseif (preg_match('/<MEMO>([^<\n]+)/i', $content, $m)) {
            $description = trim($m[1]);
        }

        // Extract FITID
        if (preg_match('/<FITID>([^<\n]+)/i', $content, $m)) {
            $fitid = trim($m[1]);
        }

        // Extract TRNTYPE
        if (preg_match('/<TRNTYPE>([^<\n]+)/i', $content, $m)) {
            $trntype = trim($m[1]);
        }

        // Skip if no essential data
        if (empty($date) || $amount == 0) {
            return null;
        }

        $normalizedDescription = $this->normalizeDescription($description);

        return [
            'date' => $date,
            'original_description' => $description,
            'description' => $normalizedDescription ?: $description,
            'amount' => $amount,
            'direction' => $amount >= 0 ? 'in' : 'out',
            'type' => $amount >= 0 ? 'receita' : 'despesa',
            'transaction_type' => $trntype,
            'check_number' => '',
            'reference_number' => $fitid,
            'hash' => $this->generateHash($date, $amount, $normalizedDescription ?: $description),
            'hash_version' => self::HASH_VERSION,
        ];
    }

    /**
     * Convert SGML-style OFX to valid XML using a proper tag-closing algorithm.
     */
    private function convertToXml(string $content): string
    {
        // Remove UTF-8 BOM
        $content = preg_replace('/^\xEF\xBB\xBF/', '', $content);

        // Normalize line endings
        $content = str_replace(["\r\n", "\r"], "\n", $content);

        // Find where OFX content starts
        $ofxStart = stripos($content, '<OFX>');
        if ($ofxStart === false) {
            throw new \Exception('Invalid OFX file: No <OFX> tag found');
        }

        $content = substr($content, $ofxStart);

        // Check if already valid XML
        if (preg_match('/<\/OFX>\s*$/i', $content)) {
            return '<?xml version="1.0" encoding="UTF-8"?>' . "\n" . $content;
        }

        // Split into lines and process each
        $lines = explode("\n", $content);
        $output = [];
        $tagStack = [];

        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line))
                continue;

            // Match opening tag with value: <TAG>value
            if (preg_match('/^<([A-Z0-9.]+)>(.+)$/i', $line, $matches)) {
                $tag = strtoupper($matches[1]);
                $value = htmlspecialchars(trim($matches[2]), ENT_XML1, 'UTF-8');
                $output[] = "<{$tag}>{$value}</{$tag}>";
            }
            // Match opening tag without value: <TAG>
            elseif (preg_match('/^<([A-Z0-9.]+)>$/i', $line, $matches)) {
                $tag = strtoupper($matches[1]);
                $output[] = "<{$tag}>";
                $tagStack[] = $tag;
            }
            // Match closing tag: </TAG>
            elseif (preg_match('/^<\/([A-Z0-9.]+)>$/i', $line, $matches)) {
                $tag = strtoupper($matches[1]);
                // Pop all tags until we find this one
                while (!empty($tagStack)) {
                    $openTag = array_pop($tagStack);
                    if ($openTag === $tag) {
                        $output[] = "</{$tag}>";
                        break;
                    } else {
                        $output[] = "</{$openTag}>";
                    }
                }
            }
        }

        // Close any remaining open tags
        while (!empty($tagStack)) {
            $tag = array_pop($tagStack);
            $output[] = "</{$tag}>";
        }

        $xml = implode("\n", $output);
        return '<?xml version="1.0" encoding="UTF-8"?>' . "\n" . $xml;
    }

    /**
     * Parse bank statement messages.
     */
    private function parseBankStatement($bankMsgs, array $result): array
    {
        $stmtTrnRs = $bankMsgs->STMTTRNRS ?? null;
        if (!$stmtTrnRs)
            return $result;

        $stmtRs = $stmtTrnRs->STMTRS ?? null;
        if (!$stmtRs)
            return $result;

        $bankAcctFrom = $stmtRs->BANKACCTFROM ?? null;
        if ($bankAcctFrom) {
            $result['account_info'] = [
                'bank_id' => (string) ($bankAcctFrom->BANKID ?? ''),
                'account_number' => (string) ($bankAcctFrom->ACCTID ?? ''),
                'account_type' => (string) ($bankAcctFrom->ACCTTYPE ?? 'CHECKING'),
            ];
        }

        $transList = $stmtRs->BANKTRANLIST ?? null;
        if ($transList && $transList->STMTTRN) {
            foreach ($transList->STMTTRN as $trn) {
                $result['transactions'][] = $this->parseXmlTransaction($trn);
            }
        }

        return $result;
    }

    /**
     * Parse credit card statement messages.
     */
    private function parseCreditCardStatement($ccMsgs, array $result): array
    {
        $stmtTrnRs = $ccMsgs->CCSTMTTRNRS ?? null;
        if (!$stmtTrnRs)
            return $result;

        $stmtRs = $stmtTrnRs->CCSTMTRS ?? null;
        if (!$stmtRs)
            return $result;

        $ccAcctFrom = $stmtRs->CCACCTFROM ?? null;
        if ($ccAcctFrom) {
            $result['account_info'] = [
                'account_number' => (string) ($ccAcctFrom->ACCTID ?? ''),
                'account_type' => 'CREDITCARD',
            ];
        }

        $transList = $stmtRs->BANKTRANLIST ?? null;
        if ($transList && $transList->STMTTRN) {
            foreach ($transList->STMTTRN as $trn) {
                $result['transactions'][] = $this->parseXmlTransaction($trn);
            }
        }

        return $result;
    }

    /**
     * Parse a single XML transaction.
     */
    private function parseXmlTransaction($trn): array
    {
        $dateStr = (string) ($trn->DTPOSTED ?? '');
        $date = $this->parseOfxDate($dateStr);

        $amount = (float) ($trn->TRNAMT ?? 0);
        $originalDescription = trim((string) ($trn->NAME ?? $trn->MEMO ?? ''));
        $description = $this->normalizeDescription($originalDescription);

        return [
            'date' => $date,
            'original_description' => $originalDescription,
            'description' => $description ?: $originalDescription,
            'amount' => $amount,
            'direction' => $amount >= 0 ? 'in' : 'out',
            'type' => $amount >= 0 ? 'receita' : 'despesa',
            'transaction_type' => (string) ($trn->TRNTYPE ?? ''),
            'check_number' => (string) ($trn->CHECKNUM ?? ''),
            'reference_number' => (string) ($trn->FITID ?? ''),
            'hash' => $this->generateHash($date, $amount, $description ?: $originalDescription),
            'hash_version' => self::HASH_VERSION,
        ];
    }

    /**
     * Parse OFX date format (YYYYMMDDHHMMSS or YYYYMMDD).
     */
    private function parseOfxDate(string $dateStr): string
    {
        $dateStr = preg_replace('/\[.*\]/', '', $dateStr);
        $dateStr = trim($dateStr);

        if (strlen($dateStr) >= 8) {
            $year = substr($dateStr, 0, 4);
            $month = substr($dateStr, 4, 2);
            $day = substr($dateStr, 6, 2);
            return "{$year}-{$month}-{$day}";
        }

        return date('Y-m-d');
    }

    /**
     * Normalize a description for consistent comparison.
     */
    private function normalizeDescription(string $description): string
    {
        $normalized = Str::lower(trim($description));
        $normalized = preg_replace('/\d{1,2}[\/-]\d{1,2}([\/-]\d{2,4})?/', '', $normalized);
        $normalized = preg_replace('/\d{1,2}:\d{2}(:\d{2})?/', '', $normalized);
        $normalized = preg_replace('/\d{5,}/', '', $normalized);
        $normalized = preg_replace('/\*\d+/', '', $normalized);
        $normalized = preg_replace('/\s+/', ' ', $normalized);
        return trim($normalized);
    }

    /**
     * Generate a versioned hash for duplicate detection.
     */
    private function generateHash(string $date, float $amount, string $normalizedDescription): string
    {
        $content = $date . '|' . number_format($amount, 2, '.', '') . '|' . $normalizedDescription;
        return md5($content);
    }

    /**
     * Get the current hash version.
     */
    public function getHashVersion(): int
    {
        return self::HASH_VERSION;
    }
}

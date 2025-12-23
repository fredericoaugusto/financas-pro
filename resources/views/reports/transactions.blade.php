<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <title>Relatório de Transações</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 10px;
            line-height: 1.4;
            color: #333;
        }

        .header {
            text-align: center;
            padding: 20px 0;
            border-bottom: 2px solid #3b82f6;
            margin-bottom: 20px;
        }

        .header h1 {
            font-size: 18px;
            color: #1e40af;
            margin-bottom: 5px;
        }

        .header p {
            font-size: 11px;
            color: #666;
        }

        .meta {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            padding: 10px;
            background: #f8fafc;
            border-radius: 4px;
        }

        .meta-item {
            font-size: 10px;
        }

        .meta-label {
            color: #666;
        }

        .meta-value {
            font-weight: bold;
            color: #333;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }

        th {
            background: #3b82f6;
            color: white;
            padding: 8px 4px;
            text-align: left;
            font-size: 9px;
            font-weight: 600;
        }

        td {
            padding: 6px 4px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 9px;
        }

        tr:nth-child(even) {
            background: #f9fafb;
        }

        .text-right {
            text-align: right;
        }

        .text-center {
            text-align: center;
        }

        .receita {
            color: #059669;
        }

        .despesa {
            color: #dc2626;
        }

        .totals {
            margin-top: 20px;
            padding: 15px;
            background: #f1f5f9;
            border-radius: 8px;
        }

        .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px solid #e2e8f0;
        }

        .totals-row:last-child {
            border-bottom: none;
            padding-top: 10px;
            font-weight: bold;
            font-size: 12px;
        }

        .totals-label {
            color: #64748b;
        }

        .income-value {
            color: #059669;
            font-weight: bold;
        }

        .expense-value {
            color: #dc2626;
            font-weight: bold;
        }

        .balance-positive {
            color: #059669;
        }

        .balance-negative {
            color: #dc2626;
        }

        .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 8px;
            color: #9ca3af;
        }
    </style>
</head>

<body>
    <div class="header">
        <h1>📊 FinançasPro - Relatório de Transações</h1>
        <p>Período: {{ $period_label }}</p>
        <p>Gerado em: {{ $generated_at }}</p>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width: 12%">Data</th>
                <th style="width: 28%">Descrição</th>
                <th style="width: 10%">Tipo</th>
                <th style="width: 12%">Pagamento</th>
                <th style="width: 15%">Categoria</th>
                <th style="width: 13%">Conta</th>
                <th style="width: 10%" class="text-right">Valor</th>
            </tr>
        </thead>
        <tbody>
            @foreach($transactions as $tx)
                <tr>
                    <td>{{ \Carbon\Carbon::parse($tx->date)->format('d/m/Y') }}</td>
                    <td>{{ Str::limit($tx->description, 35) }}</td>
                    <td class="{{ $tx->type }}">{{ ucfirst($tx->type) }}</td>
                    <td>{{ $tx->payment_method ? ucfirst($tx->payment_method) : '-' }}</td>
                    <td>{{ $tx->category?->name ?? '-' }}</td>
                    <td>{{ $tx->account?->name ?? '-' }}</td>
                    <td class="text-right {{ $tx->type }}">
                        R$ {{ number_format($tx->value, 2, ',', '.') }}
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="totals">
        <table style="margin: 0;">
            <tr>
                <td style="border: none; padding: 5px 0;">
                    <span class="totals-label">Total de Receitas:</span>
                </td>
                <td style="border: none; padding: 5px 0; text-align: right;">
                    <span class="income-value">R$ {{ number_format($totals['income'], 2, ',', '.') }}</span>
                </td>
            </tr>
            <tr>
                <td style="border: none; padding: 5px 0;">
                    <span class="totals-label">Total de Despesas:</span>
                </td>
                <td style="border: none; padding: 5px 0; text-align: right;">
                    <span class="expense-value">R$ {{ number_format($totals['expense'], 2, ',', '.') }}</span>
                </td>
            </tr>
            <tr>
                <td style="border: none; padding: 10px 0; font-weight: bold; font-size: 12px;">
                    Saldo do Período:
                </td>
                <td style="border: none; padding: 10px 0; text-align: right; font-weight: bold; font-size: 12px;">
                    <span class="{{ $totals['balance'] >= 0 ? 'balance-positive' : 'balance-negative' }}">
                        R$ {{ number_format($totals['balance'], 2, ',', '.') }}
                    </span>
                </td>
            </tr>
        </table>
    </div>

    <div class="footer">
        <p>Este documento foi gerado automaticamente pelo sistema FinançasPro.</p>
        <p>Total de {{ $transactions->count() }} transações exportadas.</p>
    </div>
</body>

</html>
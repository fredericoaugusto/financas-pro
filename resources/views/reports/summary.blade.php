<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <title>Resumo Financeiro</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 11px;
            line-height: 1.5;
            color: #333;
            padding: 20px;
        }

        .header {
            text-align: center;
            padding: 25px 0;
            border-bottom: 3px solid #3b82f6;
            margin-bottom: 25px;
        }

        .header h1 {
            font-size: 20px;
            color: #1e40af;
            margin-bottom: 8px;
        }

        .header p {
            font-size: 12px;
            color: #666;
        }

        .summary-cards {
            margin-bottom: 30px;
        }

        .summary-cards table {
            width: 100%;
            border-collapse: collapse;
        }

        .summary-cards td {
            width: 33.33%;
            padding: 15px;
            text-align: center;
            vertical-align: top;
        }

        .card {
            background: #f8fafc;
            border-radius: 8px;
            padding: 20px;
            border: 1px solid #e2e8f0;
        }

        .card-label {
            font-size: 10px;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 8px;
        }

        .card-value {
            font-size: 18px;
            font-weight: bold;
        }

        .card-income .card-value {
            color: #059669;
        }

        .card-expense .card-value {
            color: #dc2626;
        }

        .card-balance .card-value {
            color: #3b82f6;
        }

        .section {
            margin-bottom: 25px;
        }

        .section-title {
            font-size: 14px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 12px;
            padding-bottom: 5px;
            border-bottom: 2px solid #e2e8f0;
        }

        table.data {
            width: 100%;
            border-collapse: collapse;
        }

        table.data th {
            background: #f1f5f9;
            padding: 10px 8px;
            text-align: left;
            font-size: 10px;
            font-weight: 600;
            color: #475569;
            border-bottom: 2px solid #e2e8f0;
        }

        table.data td {
            padding: 10px 8px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 11px;
        }

        table.data tr:last-child td {
            border-bottom: none;
        }

        .text-right {
            text-align: right;
        }

        .percentage {
            color: #64748b;
            font-size: 10px;
        }

        .expense-color {
            color: #dc2626;
        }

        .income-color {
            color: #059669;
        }

        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 9px;
            color: #9ca3af;
            border-top: 1px solid #e2e8f0;
            padding-top: 15px;
        }

        .empty-message {
            color: #9ca3af;
            font-style: italic;
            padding: 15px;
            text-align: center;
        }
    </style>
</head>

<body>
    <div class="header">
        <h1>📊 FinançasPro - Resumo Financeiro</h1>
        <p>Período: {{ $period_label }}</p>
        <p>Gerado em: {{ $generated_at }}</p>
    </div>

    <div class="summary-cards">
        <table>
            <tr>
                <td>
                    <div class="card card-income">
                        <div class="card-label">Total de Receitas</div>
                        <div class="card-value">R$ {{ number_format($totals['income'], 2, ',', '.') }}</div>
                    </div>
                </td>
                <td>
                    <div class="card card-expense">
                        <div class="card-label">Total de Despesas</div>
                        <div class="card-value">R$ {{ number_format($totals['expense'], 2, ',', '.') }}</div>
                    </div>
                </td>
                <td>
                    <div class="card card-balance">
                        <div class="card-label">Saldo do Período</div>
                        <div class="card-value" style="color: {{ $totals['balance'] >= 0 ? '#059669' : '#dc2626' }}">
                            R$ {{ number_format($totals['balance'], 2, ',', '.') }}
                        </div>
                    </div>
                </td>
            </tr>
        </table>
    </div>

    <div class="section">
        <div class="section-title">📉 Despesas por Categoria</div>
        @if($expenses_by_category->isEmpty())
            <p class="empty-message">Nenhuma despesa no período selecionado.</p>
        @else
            <table class="data">
                <thead>
                    <tr>
                        <th>Categoria</th>
                        <th class="text-right">Valor</th>
                        <th class="text-right">%</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($expenses_by_category as $item)
                        <tr>
                            <td>{{ $item['category'] }}</td>
                            <td class="text-right expense-color">R$ {{ number_format($item['value'], 2, ',', '.') }}</td>
                            <td class="text-right percentage">{{ number_format($item['percentage'], 1) }}%</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    </div>

    <div class="section">
        <div class="section-title">📈 Receitas por Categoria</div>
        @if($income_by_category->isEmpty())
            <p class="empty-message">Nenhuma receita no período selecionado.</p>
        @else
            <table class="data">
                <thead>
                    <tr>
                        <th>Categoria</th>
                        <th class="text-right">Valor</th>
                        <th class="text-right">%</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($income_by_category as $item)
                        <tr>
                            <td>{{ $item['category'] }}</td>
                            <td class="text-right income-color">R$ {{ number_format($item['value'], 2, ',', '.') }}</td>
                            <td class="text-right percentage">{{ number_format($item['percentage'], 1) }}%</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    </div>

    <div class="footer">
        <p>Este documento foi gerado automaticamente pelo sistema FinançasPro.</p>
    </div>
</body>

</html>
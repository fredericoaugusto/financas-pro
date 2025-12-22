<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     * 
     * RECORRÊNCIAS:
     * - Regra geradora de transações
     * - Cada transação gerada é INDEPENDENTE
     * - Nunca gera retroativos
     * - next_occurrence define a próxima geração
     * - last_generated_at evita duplicações
     */
    public function up(): void
    {
        Schema::create('recurring_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            // Dados da transação template
            $table->enum('type', ['receita', 'despesa']);
            $table->decimal('value', 15, 2);
            $table->string('description');
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('account_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('card_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('payment_method', ['dinheiro', 'debito', 'credito', 'pix', 'boleto', 'transferencia'])->default('dinheiro');
            $table->text('notes')->nullable();

            // Configuração da recorrência
            $table->enum('frequency', ['semanal', 'mensal', 'anual', 'personalizada'])->default('mensal');
            $table->integer('frequency_value')->default(1); // a cada X (semanas/meses/anos/dias)

            // Controle de período
            $table->date('start_date'); // Data base da recorrência
            $table->date('end_date')->nullable(); // Fim opcional
            $table->date('next_occurrence'); // Próxima geração (ESSENCIAL)
            $table->date('last_generated_at')->nullable(); // Última geração (evita duplicações)

            // Status
            $table->enum('status', ['ativa', 'pausada', 'encerrada'])->default('ativa');

            $table->timestamps();

            // Índices para performance
            $table->index(['user_id', 'status']);
            $table->index(['next_occurrence', 'status']);
        });

        // Adicionar referência opcional na transactions
        Schema::table('transactions', function (Blueprint $table) {
            $table->foreignId('recurring_transaction_id')
                ->nullable()
                ->after('id')
                ->constrained('recurring_transactions')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropForeign(['recurring_transaction_id']);
            $table->dropColumn('recurring_transaction_id');
        });

        Schema::dropIfExists('recurring_transactions');
    }
};

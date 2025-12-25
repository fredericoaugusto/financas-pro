<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('account_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('from_account_id')->nullable()->constrained('accounts')->nullOnDelete();
            $table->foreignId('card_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('card_invoice_id')->nullable()->constrained('card_invoices')->nullOnDelete();

            // Usar string ao invés de enum para compatibilidade PostgreSQL/SQLite
            $table->string('type', 30); // receita, despesa, transferencia, ajuste, devolucao, antecipacao_parcela
            $table->decimal('value', 15, 2);
            $table->string('description');
            $table->date('date');
            $table->time('time')->nullable();
            $table->string('payment_method', 20)->nullable(); // dinheiro, debito, credito, pix, boleto, transferencia

            // Parcelamento
            $table->foreignId('parent_transaction_id')->nullable()->constrained('transactions')->nullOnDelete();
            $table->unsignedTinyInteger('installment_number')->nullable();
            $table->unsignedTinyInteger('total_installments')->nullable();

            // Antecipação
            $table->timestamp('anticipated_at')->nullable();
            $table->decimal('anticipated_value', 15, 2)->nullable();
            $table->decimal('anticipated_discount', 15, 2)->nullable();

            // ⭐ CRÍTICO: Controle de impacto no saldo
            // Transação pai de parcelamento NÃO afeta saldo (evita duplicidade)
            $table->boolean('affects_balance')->default(true);

            $table->string('status', 20)->default('confirmada'); // pendente, confirmada, cancelada, antecipada, estornada
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Índices para performance
            $table->index(['user_id', 'date']);
            $table->index(['user_id', 'type']);
            $table->index(['account_id', 'date']);
            $table->index(['card_id', 'card_invoice_id']);
            $table->index(['parent_transaction_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};

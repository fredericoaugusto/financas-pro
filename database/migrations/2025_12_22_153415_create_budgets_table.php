<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     * 
     * Orçamentos por categoria e mês
     * REGRA: Apenas informa e alerta, nunca bloqueia gastos
     */
    public function up(): void
    {
        Schema::create('budgets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('category_id')->constrained()->onDelete('cascade');
            $table->string('reference_month', 7); // YYYY-MM
            $table->decimal('limit_value', 15, 2);
            $table->timestamps();

            // Índice único: um orçamento por categoria por mês por usuário
            $table->unique(['user_id', 'category_id', 'reference_month'], 'budget_unique');

            // Índice para busca por mês
            $table->index(['user_id', 'reference_month']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('budgets');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('primary_account_id')->nullable()->constrained('accounts')->nullOnDelete();
            $table->string('name');
            $table->string('bank');
            $table->string('brand', 20); // visa, mastercard, elo, amex, diners, hipercard, discover
            $table->string('holder_name');
            $table->string('last_4_digits', 4);
            $table->string('valid_thru', 7); // MM/AAAA
            $table->decimal('credit_limit', 15, 2);
            $table->string('type', 10)->default('credito'); // debito, credito, hibrido
            $table->unsignedTinyInteger('closing_day'); // 1-28
            $table->unsignedTinyInteger('due_day'); // 1-31
            $table->string('status', 15)->default('ativo'); // ativo, bloqueado, cancelado, expirado, arquivado
            $table->string('icon')->nullable();
            $table->string('color')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cards');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('general_budget_periods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('general_budget_id')->constrained('general_budgets')->onDelete('cascade');
            $table->unsignedSmallInteger('reference_year');
            $table->unsignedTinyInteger('reference_month')->nullable(); // null for yearly
            $table->decimal('limit_value_snapshot', 12, 2); // limit at the time
            $table->decimal('spent', 12, 2)->default(0); // cached spent value
            $table->enum('status', ['ok', 'warning', 'exceeded'])->default('ok');
            $table->boolean('alert_80_sent')->default(false);
            $table->boolean('alert_100_sent')->default(false);
            $table->timestamps();

            $table->unique(['general_budget_id', 'reference_year', 'reference_month'], 'gbp_unique_period');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('general_budget_periods');
    }
};

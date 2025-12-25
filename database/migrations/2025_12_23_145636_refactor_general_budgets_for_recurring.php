<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     * Refactor general_budgets to be a recurring rule instead of fixed month/year.
     */
    public function up(): void
    {
        // For SQLite, we need to recreate the table
        if (config('database.default') === 'sqlite') {
            DB::statement('PRAGMA foreign_keys=off');

            // Create new table with updated schema
            DB::statement('CREATE TABLE general_budgets_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT DEFAULT "Orçamento Geral",
                limit_value REAL NOT NULL,
                period_type TEXT DEFAULT "monthly" CHECK(period_type IN ("monthly", "yearly")),
                start_date TEXT,
                status TEXT DEFAULT "active" CHECK(status IN ("active", "paused", "ended")),
                category_ids TEXT,
                include_future_categories INTEGER DEFAULT 1,
                created_at TEXT,
                updated_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )');

            // Migrate existing data (convert old fields to new structure)
            DB::statement('INSERT INTO general_budgets_new 
                (id, user_id, name, limit_value, period_type, start_date, status, category_ids, include_future_categories, created_at, updated_at)
                SELECT 
                    id, 
                    user_id, 
                    name, 
                    amount,
                    CASE WHEN type = "mensal" THEN "monthly" ELSE "yearly" END,
                    CASE 
                        WHEN month IS NOT NULL THEN printf("%04d-%02d-01", year, month)
                        ELSE printf("%04d-01-01", year)
                    END,
                    CASE WHEN is_active = 1 THEN "active" ELSE "paused" END,
                    category_ids,
                    include_future_categories,
                    created_at,
                    updated_at
                FROM general_budgets
            ');

            DB::statement('DROP TABLE general_budgets');
            DB::statement('ALTER TABLE general_budgets_new RENAME TO general_budgets');
            DB::statement('PRAGMA foreign_keys=on');
        } else {
            // MySQL/PostgreSQL
            Schema::table('general_budgets', function (Blueprint $table) {
                $table->renameColumn('amount', 'limit_value');
                $table->renameColumn('type', 'period_type');
                $table->date('start_date')->nullable()->after('period_type');
                $table->string('status', 10)->default('active')->after('start_date'); // active, paused, ended
                $table->dropColumn(['month', 'year', 'is_active', 'alert_80_sent', 'alert_100_sent']);
            });

            // Update enum values
            DB::statement("UPDATE general_budgets SET period_type = 'monthly' WHERE period_type = 'mensal'");
            DB::statement("UPDATE general_budgets SET period_type = 'yearly' WHERE period_type = 'anual'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This is a destructive migration - no rollback needed for MVP
    }
};

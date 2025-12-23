<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // SQLite doesn't support modifying columns, so we need to:
        // 1. Create a new table with the desired schema
        // 2. Copy data
        // 3. Drop old table
        // 4. Rename new table

        if (config('database.default') === 'sqlite') {
            // Disable foreign key checks temporarily
            DB::statement('PRAGMA foreign_keys=off');

            // Create new table without NOT NULL on bank
            DB::statement('CREATE TABLE cards_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                account_id INTEGER,
                primary_account_id INTEGER,
                name TEXT NOT NULL,
                bank TEXT,
                brand TEXT,
                holder_name TEXT,
                last_4_digits TEXT,
                valid_thru TEXT,
                credit_limit REAL DEFAULT 0,
                used_limit REAL DEFAULT 0,
                type TEXT DEFAULT "credito",
                closing_day INTEGER DEFAULT 25,
                due_day INTEGER DEFAULT 10,
                status TEXT DEFAULT "ativo",
                icon TEXT,
                color TEXT,
                notes TEXT,
                created_at TEXT,
                updated_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
            )');

            // Copy data from old table
            DB::statement('INSERT INTO cards_new SELECT * FROM cards');

            // Drop old table
            DB::statement('DROP TABLE cards');

            // Rename new table
            DB::statement('ALTER TABLE cards_new RENAME TO cards');

            // Re-enable foreign key checks
            DB::statement('PRAGMA foreign_keys=on');
        } else {
            // For MySQL/PostgreSQL, just modify the column
            Schema::table('cards', function (Blueprint $table) {
                $table->string('bank')->nullable()->default(null)->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No need to revert - making nullable is a safe operation
    }
};

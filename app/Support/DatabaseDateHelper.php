<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

/**
 * Database-agnostic date formatting helper.
 * Provides SQL expressions that work across SQLite, PostgreSQL, and MySQL.
 */
class DatabaseDateHelper
{
    /**
     * Get SQL expression for extracting Year-Month (YYYY-MM) from a date column.
     */
    public static function monthYear(string $column): string
    {
        return match (DB::getDriverName()) {
            'pgsql' => "to_char({$column}, 'YYYY-MM')",
            'mysql' => "DATE_FORMAT({$column}, '%Y-%m')",
            default => "strftime('%Y-%m', {$column})", // sqlite
        };
    }

    /**
     * Get SQL expression for extracting Year (YYYY) from a date column.
     */
    public static function year(string $column): string
    {
        return match (DB::getDriverName()) {
            'pgsql' => "EXTRACT(YEAR FROM {$column})::integer",
            'mysql' => "YEAR({$column})",
            default => "CAST(strftime('%Y', {$column}) AS INTEGER)", // sqlite
        };
    }

    /**
     * Get SQL expression for extracting Month (MM) from a date column.
     */
    public static function month(string $column): string
    {
        return match (DB::getDriverName()) {
            'pgsql' => "EXTRACT(MONTH FROM {$column})::integer",
            'mysql' => "MONTH({$column})",
            default => "CAST(strftime('%m', {$column}) AS INTEGER)", // sqlite
        };
    }

    /**
     * Get SQL expression for extracting Day from a date column.
     */
    public static function day(string $column): string
    {
        return match (DB::getDriverName()) {
            'pgsql' => "EXTRACT(DAY FROM {$column})::integer",
            'mysql' => "DAY({$column})",
            default => "CAST(strftime('%d', {$column}) AS INTEGER)", // sqlite
        };
    }

    /**
     * Get SQL expression for day of week (0=Sunday to 6=Saturday).
     */
    public static function dayOfWeek(string $column): string
    {
        return match (DB::getDriverName()) {
            'pgsql' => "EXTRACT(DOW FROM {$column})::integer",
            'mysql' => "DAYOFWEEK({$column}) - 1",
            default => "CAST(strftime('%w', {$column}) AS INTEGER)", // sqlite
        };
    }

    /**
     * Get SQL expression for formatted date (YYYY-MM-DD).
     */
    public static function dateFormat(string $column): string
    {
        return match (DB::getDriverName()) {
            'pgsql' => "to_char({$column}, 'YYYY-MM-DD')",
            'mysql' => "DATE_FORMAT({$column}, '%Y-%m-%d')",
            default => "strftime('%Y-%m-%d', {$column})", // sqlite
        };
    }

    /**
     * Get SQL expression for date difference in days.
     */
    public static function dateDiffDays(string $column1, string $column2): string
    {
        return match (DB::getDriverName()) {
            'pgsql' => "({$column1}::date - {$column2}::date)",
            'mysql' => "DATEDIFF({$column1}, {$column2})",
            default => "CAST(julianday({$column1}) - julianday({$column2}) AS INTEGER)", // sqlite
        };
    }
}

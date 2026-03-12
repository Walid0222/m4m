<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Fix rows where dismissed_at was accidentally stored as the literal string
     * "dismissed_at" instead of NULL or a valid timestamp.
     */
    public function up(): void
    {
        DB::table('seller_warnings')
            ->where('dismissed_at', 'dismissed_at')
            ->update(['dismissed_at' => null]);
    }

    /**
     * There is no safe way to revert this without knowing the original values,
     * so the down migration is intentionally left empty.
     */
    public function down(): void
    {
        // no-op
    }
};


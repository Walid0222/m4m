<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seller_warnings', function (Blueprint $table) {
            if (! Schema::hasColumn('seller_warnings', 'dismissed_at')) {
                $table->timestamp('dismissed_at')->nullable()->after('is_read');
            }
        });
    }

    public function down(): void
    {
        Schema::table('seller_warnings', function (Blueprint $table) {
            if (Schema::hasColumn('seller_warnings', 'dismissed_at')) {
                $table->dropColumn('dismissed_at');
            }
        });
    }
};

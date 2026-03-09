<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'ban_reason')) {
                $table->string('ban_reason', 500)->nullable()->after('banned_until');
            }
            if (! Schema::hasColumn('users', 'warning_count')) {
                $table->unsignedSmallInteger('warning_count')->default(0)->after('ban_reason');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['ban_reason', 'warning_count']);
        });
    }
};

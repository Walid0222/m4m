<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Update all existing NULL values
        DB::table('services')
            ->whereNull('display_order')
            ->update(['display_order' => 999]);

        // 2. Modify the column: keep nullable, add default 999
        Schema::table('services', function (Blueprint $table) {
            $table->unsignedInteger('display_order')->nullable()->default(999)->change();
        });
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->unsignedInteger('display_order')->nullable()->change();
        });
    }
};

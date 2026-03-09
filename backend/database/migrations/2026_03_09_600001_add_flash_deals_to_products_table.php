<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->boolean('is_flash_deal')->default(false)->after('status');
            $table->decimal('flash_price', 15, 2)->nullable()->after('is_flash_deal');
            $table->timestamp('flash_start')->nullable()->after('flash_price');
            $table->timestamp('flash_end')->nullable()->after('flash_start');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['is_flash_deal', 'flash_price', 'flash_start', 'flash_end']);
        });
    }
};


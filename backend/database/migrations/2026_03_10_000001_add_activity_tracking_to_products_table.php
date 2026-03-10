<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->unsignedInteger('views_last_3_days')->default(0)->after('views');
            $table->unsignedInteger('orders_last_3_days')->default(0)->after('views_last_3_days');
            $table->dateTime('activity_reset_at')->nullable()->after('orders_last_3_days');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['views_last_3_days', 'orders_last_3_days', 'activity_reset_at']);
        });
    }
};

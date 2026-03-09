<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('order_number')->unique()->nullable()->after('id');
            $table->unsignedBigInteger('seller_id')->nullable()->after('user_id');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->text('delivery_credentials')->nullable()->after('total_price');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['order_number', 'seller_id']);
        });
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn('delivery_credentials');
        });
    }
};

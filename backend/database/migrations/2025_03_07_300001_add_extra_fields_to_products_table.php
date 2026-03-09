<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('delivery_time')->nullable()->after('stock');
            $table->string('delivery_type')->default('manual')->after('delivery_time'); // manual | instant
            $table->text('delivery_content')->nullable()->after('delivery_type');
            $table->text('seller_reminder')->nullable()->after('delivery_content');
            $table->json('features')->nullable()->after('seller_reminder');
            $table->boolean('is_verified_seller')->default(false)->after('features');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['delivery_time', 'delivery_type', 'delivery_content', 'seller_reminder', 'features', 'is_verified_seller']);
        });
    }
};

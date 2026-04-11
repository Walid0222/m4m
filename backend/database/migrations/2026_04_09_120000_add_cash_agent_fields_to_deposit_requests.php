<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('deposit_requests', function (Blueprint $table) {
            $table->string('transaction_code')->nullable()->unique()->after('payment_reference');
            $table->string('receipt_image')->nullable()->after('transaction_code');
        });
    }

    public function down(): void
    {
        Schema::table('deposit_requests', function (Blueprint $table) {
            $table->dropColumn(['transaction_code', 'receipt_image']);
        });
    }
};

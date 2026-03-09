<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->decimal('escrow_amount', 15, 2)->default(0)->after('total_amount');
            $table->string('escrow_status')->default('none')->after('escrow_amount'); // none|held|released|refunded
            $table->timestamp('delivered_at')->nullable()->after('escrow_status');
            $table->timestamp('completed_at')->nullable()->after('delivered_at');
            $table->timestamp('auto_confirm_at')->nullable()->after('completed_at'); // deadline for auto-confirm
        });

        Schema::table('wallet_transactions', function (Blueprint $table) {
            $table->string('status')->default('completed')->after('type'); // completed|hold|released|refunded
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['escrow_amount', 'escrow_status', 'delivered_at', 'completed_at', 'auto_confirm_at']);
        });
        Schema::table('wallet_transactions', function (Blueprint $table) {
            $table->dropColumn('status');
        });
    }
};

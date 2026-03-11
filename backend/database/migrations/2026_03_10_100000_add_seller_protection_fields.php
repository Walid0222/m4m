<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'seller_level')) {
                $table->string('seller_level')->default('new')->after('is_verified_seller');
            }
            if (! Schema::hasColumn('users', 'seller_payout_delay_hours')) {
                $table->unsignedInteger('seller_payout_delay_hours')->default(72)->after('seller_level');
            }
        });

        Schema::table('orders', function (Blueprint $table) {
            if (! Schema::hasColumn('orders', 'release_at')) {
                $table->timestamp('release_at')->nullable()->after('auto_confirm_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'seller_level')) {
                $table->dropColumn('seller_level');
            }
            if (Schema::hasColumn('users', 'seller_payout_delay_hours')) {
                $table->dropColumn('seller_payout_delay_hours');
            }
        });

        Schema::table('orders', function (Blueprint $table) {
            if (Schema::hasColumn('orders', 'release_at')) {
                $table->dropColumn('release_at');
            }
        });
    }
};


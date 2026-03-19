<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('referral_attributions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('referral_code_id')
                ->constrained('referral_codes')
                ->cascadeOnDelete();

            // One attribution per order.
            $table->foreignId('order_id')
                ->constrained()
                ->cascadeOnDelete();
            $table->unique('order_id');

            $table->foreignId('buyer_user_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->string('status', 20)->default('pending'); // pending, paid, refunded
            $table->unsignedSmallInteger('affiliate_share_percent_used'); // snapshot at attribution creation

            $table->timestamp('pending_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('refunded_at')->nullable();

            // Monetary amounts (snapshot at payout time).
            $table->decimal('platform_fee_amount', 15, 2)->nullable();
            $table->decimal('affiliate_amount', 15, 2)->nullable();
            $table->decimal('platform_net_amount', 15, 2)->nullable();

            $table->timestamps();

            $table->index('referral_code_id');
            $table->index('buyer_user_id');
            $table->index('status');
            $table->index('paid_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('referral_attributions');
    }
};


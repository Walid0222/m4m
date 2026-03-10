<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallet_settings', function (Blueprint $table) {
            $table->id();
            $table->decimal('min_withdraw_amount', 12, 2)->default(50);
            $table->decimal('max_withdraw_amount', 12, 2)->default(2000);
            $table->decimal('daily_withdraw_limit', 12, 2)->default(5000);
            $table->unsignedInteger('withdraw_cooldown_hours')->default(24);
            $table->unsignedInteger('max_pending_requests')->default(3);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_settings');
    }
};


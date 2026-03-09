<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_id')->constrained('users')->cascadeOnDelete();
            $table->string('action'); // ban_seller|unban_seller|delete_product|approve_verification|reject_verification|resolve_dispute|approve_deposit|reject_deposit
            $table->unsignedBigInteger('target_user_id')->nullable();
            $table->unsignedBigInteger('target_product_id')->nullable();
            $table->unsignedBigInteger('target_order_id')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();

            $table->index(['admin_id', 'created_at']);
            $table->index('action');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_logs');
    }
};

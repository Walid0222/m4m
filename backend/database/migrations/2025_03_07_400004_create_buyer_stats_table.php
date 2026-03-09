<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('buyer_stats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('buyer_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->unsignedInteger('total_purchases')->default(0);
            $table->unsignedInteger('total_orders')->default(0);
            $table->decimal('total_spent', 15, 2)->default(0);
            $table->unsignedInteger('reviews_given')->default(0);
            $table->unsignedInteger('dispute_count')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('buyer_stats');
    }
};

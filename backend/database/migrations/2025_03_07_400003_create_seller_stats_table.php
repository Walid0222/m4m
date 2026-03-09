<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seller_stats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->unsignedInteger('total_sales')->default(0);
            $table->unsignedInteger('total_orders')->default(0);
            $table->decimal('total_revenue', 15, 2)->default(0);
            $table->decimal('rating_average', 3, 2)->default(0);
            $table->unsignedInteger('rating_count')->default(0);
            $table->unsignedInteger('dispute_count')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seller_stats');
    }
};

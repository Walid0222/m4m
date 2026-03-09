<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('reporter_id')->nullable();
            $table->unsignedBigInteger('reported_product_id')->nullable();
            $table->unsignedBigInteger('reported_seller_id')->nullable();
            $table->string('type')->default('product'); // product | seller
            $table->string('reason');
            $table->text('description')->nullable();
            $table->string('target_name')->nullable();
            $table->string('status')->default('pending'); // pending | resolved | ignored
            $table->string('admin_action')->nullable();
            $table->timestamps();

            $table->index(['status', 'type']);
            $table->index('reporter_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};

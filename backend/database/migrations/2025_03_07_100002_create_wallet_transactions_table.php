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
        Schema::create('wallet_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('wallet_id')->constrained()->cascadeOnDelete();
            $table->string('type'); // e.g. deposit, withdrawal, order_payment, order_refund
            $table->decimal('amount', 15, 2); // positive for credit, negative for debit
            $table->decimal('balance_after', 15, 2)->nullable();
            $table->string('reference_type')->nullable(); // polymorphic type
            $table->unsignedBigInteger('reference_id')->nullable(); // polymorphic id
            $table->text('description')->nullable();
            $table->timestamps();

            $table->index(['wallet_id', 'created_at']);
            $table->index(['reference_type', 'reference_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('wallet_transactions');
    }
};

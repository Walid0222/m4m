<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seller_verifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_id')->constrained('users')->cascadeOnDelete();
            $table->string('id_card_front');
            $table->string('id_card_back');
            $table->string('bank_statement')->nullable();
            $table->string('status')->default('pending'); // pending | approved | rejected
            $table->timestamps();

            $table->unique('seller_id'); // one request per seller
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seller_verifications');
    }
};

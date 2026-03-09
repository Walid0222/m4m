<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_security_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('ip_address', 45)->nullable();
            $table->string('device')->nullable();
            $table->string('location')->nullable();
            $table->string('action'); // login|purchase|password_change|failed_login|logout
            $table->json('metadata')->nullable(); // extra context (order_id, etc.)
            $table->timestamps();

            $table->index(['user_id', 'action', 'created_at']);
            $table->index(['ip_address', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_security_logs');
    }
};

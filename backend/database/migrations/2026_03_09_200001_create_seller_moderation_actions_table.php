<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seller_moderation_actions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('admin_id')->constrained('users')->cascadeOnDelete();
            $table->string('action', 30);      // warn | temporary_ban | permanent_ban | unban
            $table->string('reason', 500)->nullable();
            $table->unsignedSmallInteger('days')->nullable(); // for temporary_ban
            $table->timestamp('banned_until')->nullable();    // snapshot at time of action
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seller_moderation_actions');
    }
};

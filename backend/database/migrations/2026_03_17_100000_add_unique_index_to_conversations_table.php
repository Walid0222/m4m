<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Enforce one conversation per (user_one_id, user_two_id, type).
     * Regular chats: one per user pair. Support chats (type=support, user_two_id=null) unaffected.
     */
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->unique(['user_one_id', 'user_two_id', 'type'], 'conversations_unique_pair');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropUnique('conversations_unique_pair');
        });
    }
};

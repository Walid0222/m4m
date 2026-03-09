<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->string('type')->default('regular')->after('id'); // regular | support
            // user_two_id is nullable for support chats (only user_one_id = user)
            $table->unsignedBigInteger('user_two_id')->nullable()->change();
        });

        // messages table already uses read_at (nullable timestamp) for seen status
    }

    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropColumn('type');
        });
    }
};

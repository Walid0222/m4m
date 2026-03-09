<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_banned')->default(false)->after('is_admin');
            $table->string('ban_type')->nullable()->after('is_banned'); // temporary | permanent
            $table->timestamp('banned_until')->nullable()->after('ban_type');
            $table->boolean('is_verified_seller')->default(false)->after('banned_until');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['is_banned', 'ban_type', 'banned_until', 'is_verified_seller']);
        });
    }
};

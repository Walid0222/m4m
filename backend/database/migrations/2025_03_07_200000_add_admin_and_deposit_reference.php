<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_admin')->default(false)->after('is_seller');
        });

        Schema::table('deposit_requests', function (Blueprint $table) {
            $table->string('reference_code', 20)->unique()->nullable()->after('user_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_admin');
        });

        Schema::table('deposit_requests', function (Blueprint $table) {
            $table->dropColumn('reference_code');
        });
    }
};

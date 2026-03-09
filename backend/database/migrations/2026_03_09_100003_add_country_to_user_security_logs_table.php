<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_security_logs', function (Blueprint $table) {
            if (! Schema::hasColumn('user_security_logs', 'country')) {
                $table->string('country', 100)->nullable()->after('location');
            }
            if (! Schema::hasColumn('user_security_logs', 'user_agent')) {
                $table->string('user_agent', 500)->nullable()->after('country');
            }
            if (! Schema::hasColumn('user_security_logs', 'flagged')) {
                $table->boolean('flagged')->default(false)->after('user_agent');
            }
            if (! Schema::hasColumn('user_security_logs', 'flag_reason')) {
                $table->string('flag_reason', 255)->nullable()->after('flagged');
            }
        });
    }

    public function down(): void
    {
        Schema::table('user_security_logs', function (Blueprint $table) {
            $table->dropColumn(['country', 'user_agent', 'flagged', 'flag_reason']);
        });
    }
};

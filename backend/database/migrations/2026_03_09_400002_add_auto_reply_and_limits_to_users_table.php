<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->text('auto_reply_message')->nullable()->after('ban_reason');
            $table->unsignedSmallInteger('product_limit')->default(5)->after('auto_reply_message');
            $table->boolean('limits_overridden')->default(false)->after('product_limit');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['auto_reply_message', 'product_limit', 'limits_overridden']);
        });
    }
};

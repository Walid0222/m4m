<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (! Schema::hasColumn('orders', 'delivery_content')) {
                $table->text('delivery_content')->nullable()->after('auto_confirm_at');
            }
            if (! Schema::hasColumn('orders', 'delivery_type')) {
                $table->string('delivery_type', 20)->nullable()->after('delivery_content');
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['delivery_content', 'delivery_type']);
        });
    }
};

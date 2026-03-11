<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('disputes', function (Blueprint $table) {
            if (! Schema::hasColumn('disputes', 'admin_note')) {
                $table->text('admin_note')->nullable()->after('admin_decision');
            }
        });
    }

    public function down(): void
    {
        Schema::table('disputes', function (Blueprint $table) {
            if (Schema::hasColumn('disputes', 'admin_note')) {
                $table->dropColumn('admin_note');
            }
        });
    }
};

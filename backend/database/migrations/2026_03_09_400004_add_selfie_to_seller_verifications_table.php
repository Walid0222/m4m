<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('seller_verifications', function (Blueprint $table) {
            $table->string('selfie_with_id')->nullable()->after('id_card_back');
        });
    }

    public function down(): void
    {
        Schema::table('seller_verifications', function (Blueprint $table) {
            $table->dropColumn('selfie_with_id');
        });
    }
};


<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->boolean('is_featured')->default(false)->after('category_id');
            $table->unsignedInteger('display_order')->nullable()->after('is_featured');
            $table->string('homepage_image')->nullable()->after('display_order');
        });
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dropColumn(['is_featured', 'display_order', 'homepage_image']);
        });
    }
};

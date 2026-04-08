<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('dispute_evidences', function (Blueprint $table) {
            $table->id();

            $table->foreignId('dispute_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->foreignId('user_id')
                ->constrained()
                ->restrictOnDelete();

            // buyer | seller | admin
            $table->string('role', 32);

            // image | file | link | note
            $table->string('type', 32);

            $table->string('storage_disk', 64);

            $table->string('path')->nullable();

            $table->string('original_name')->nullable();

            $table->string('mime_type', 191)->nullable();

            $table->bigInteger('size_bytes')->nullable();

            $table->string('title')->nullable();

            $table->text('description')->nullable();

            $table->boolean('is_internal')->default(false);

            $table->timestamps();

            // Indexes
            $table->index(['dispute_id', 'created_at']);
            $table->index('user_id');
            $table->index(['dispute_id', 'role']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dispute_evidences');
    }
};


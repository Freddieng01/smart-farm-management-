<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('post_harvest_handlings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('field_id')->constrained('fields')->cascadeOnDelete();
            $table->date('handling_date');
            $table->string('storage_method');
            $table->string('storage_location')->nullable();
            $table->decimal('quantity', 12, 2);
            $table->string('unit');
            $table->string('condition')->nullable();
            $table->decimal('loss_quantity', 12, 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('post_harvest_handlings');
    }
};
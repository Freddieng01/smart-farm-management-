<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // One tag can stand for a whole flock or herd (e.g. 200 chickens).
        Schema::table('livestock', function (Blueprint $table) {
            $table->unsignedInteger('head_count')->default(1)->after('current_weight_kg');
        });

        Schema::create('livestock_production_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('livestock_id')->constrained('livestock')->cascadeOnDelete();
            $table->string('product');
            $table->decimal('quantity', 10, 2);
            $table->string('unit')->nullable();
            $table->date('date_recorded');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('livestock_production_records');

        Schema::table('livestock', function (Blueprint $table) {
            $table->dropColumn('head_count');
        });
    }
};

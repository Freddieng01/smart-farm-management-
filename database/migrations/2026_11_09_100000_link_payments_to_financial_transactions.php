<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Money that is paid or received (customer payments, supplier payments) now
 * writes itself into the finance ledger. These columns tie each ledger row to
 * the payment it came from, so editing or deleting the payment keeps the
 * ledger in step and a payment can never be counted twice.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('financial_transactions', function (Blueprint $table) {
            $table->foreignId('payment_id')->nullable()->unique()->constrained('payments')->cascadeOnDelete();
            $table->foreignId('purchase_payment_id')->nullable()->unique()->constrained('purchase_payments')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('financial_transactions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('payment_id');
            $table->dropConstrainedForeignId('purchase_payment_id');
        });
    }
};

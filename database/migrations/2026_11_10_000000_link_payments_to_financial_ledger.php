<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Makes the finance ledger (financial_transactions) the one place where money is recorded.
 *
 *  1. The ledger model and controller use field_id, employee_id, livestock_id,
 *     resource_transaction_id and recorded_by, but the original table never had them.
 *     They are added here (only if missing) so recording a transaction works on any database.
 *  2. payment_id / purchase_payment_id tie a ledger row to the customer payment or supplier
 *     payment it came from, so every payment posts to the ledger exactly once.
 *  3. Payments that were recorded before this change are copied across.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('financial_transactions', function (Blueprint $table) {
            if (! Schema::hasColumn('financial_transactions', 'field_id')) {
                $table->foreignId('field_id')->nullable()->constrained('fields')->nullOnDelete();
            }
            if (! Schema::hasColumn('financial_transactions', 'employee_id')) {
                $table->foreignId('employee_id')->nullable()->constrained('employees')->nullOnDelete();
            }
            if (! Schema::hasColumn('financial_transactions', 'livestock_id')) {
                $table->foreignId('livestock_id')->nullable()->constrained('livestock')->nullOnDelete();
            }
            if (! Schema::hasColumn('financial_transactions', 'resource_transaction_id')) {
                $table->foreignId('resource_transaction_id')->nullable()->unique()->constrained('resource_transactions')->nullOnDelete();
            }
            if (! Schema::hasColumn('financial_transactions', 'recorded_by')) {
                $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('financial_transactions', 'payment_id')) {
                $table->foreignId('payment_id')->nullable()->unique()->constrained('payments')->cascadeOnDelete();
            }
            if (! Schema::hasColumn('financial_transactions', 'purchase_payment_id')) {
                $table->foreignId('purchase_payment_id')->nullable()->unique()->constrained('purchase_payments')->cascadeOnDelete();
            }
        });

        $this->backfillCustomerPayments();
        $this->backfillSupplierPayments();
    }

    public function down(): void
    {
        Schema::table('financial_transactions', function (Blueprint $table) {
            foreach (['payment_id', 'purchase_payment_id'] as $column) {
                if (Schema::hasColumn('financial_transactions', $column)) {
                    $table->dropConstrainedForeignId($column);
                }
            }
        });
        // The other columns are left in place: the ledger code depends on them.
    }

    private function backfillCustomerPayments(): void
    {
        $payments = DB::table('payments as p')
            ->join('invoices as i', 'i.id', '=', 'p.invoice_id')
            ->join('sales_orders as s', 's.id', '=', 'i.sales_order_id')
            ->leftJoin('customers as c', 'c.id', '=', 's.customer_id')
            ->whereNotExists(function ($q) {
                $q->select(DB::raw(1))->from('financial_transactions as f')->whereColumn('f.payment_id', 'p.id');
            })
            ->where('p.amount_paid', '>', 0)
            ->orderBy('p.id')
            ->get([
                'p.id', 'p.amount_paid', 'p.payment_date', 'p.payment_method',
                'p.created_at', 'p.updated_at',
                's.farm_id', 'i.invoice_number', 'c.name as party',
            ]);

        foreach ($payments as $p) {
            DB::table('financial_transactions')->insert([
                'farm_id' => $p->farm_id,
                'payment_id' => $p->id,
                'type' => 'income',
                'category' => 'sale_income',
                'amount' => $p->amount_paid,
                'transaction_date' => $p->payment_date,
                'description' => mb_substr('Payment from '.($p->party ?: 'customer')." - invoice {$p->invoice_number} ({$p->payment_method})", 0, 255),
                'created_at' => $p->created_at,
                'updated_at' => $p->updated_at,
            ]);
        }
    }

    private function backfillSupplierPayments(): void
    {
        $payments = DB::table('purchase_payments as p')
            ->join('purchase_orders as o', 'o.id', '=', 'p.purchase_order_id')
            ->leftJoin('suppliers as s', 's.id', '=', 'o.supplier_id')
            ->whereNotExists(function ($q) {
                $q->select(DB::raw(1))->from('financial_transactions as f')->whereColumn('f.purchase_payment_id', 'p.id');
            })
            ->where('p.amount_paid', '>', 0)
            ->orderBy('p.id')
            ->get([
                'p.id', 'p.amount_paid', 'p.payment_date', 'p.payment_method',
                'p.created_at', 'p.updated_at',
                'o.farm_id', 'o.order_number', 's.name as party',
            ]);

        foreach ($payments as $p) {
            DB::table('financial_transactions')->insert([
                'farm_id' => $p->farm_id,
                'purchase_payment_id' => $p->id,
                'type' => 'expense',
                'category' => 'input_cost',
                'amount' => $p->amount_paid,
                'transaction_date' => $p->payment_date,
                'description' => mb_substr('Payment to '.($p->party ?: 'supplier')." - order {$p->order_number} ({$p->payment_method})", 0, 255),
                'created_at' => $p->created_at,
                'updated_at' => $p->updated_at,
            ]);
        }
    }
};

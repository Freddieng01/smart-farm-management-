<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Expense Tracking and Financial Management used to keep two separate ledgers
 * (farm_expenses and financial_transactions), so the numbers never agreed.
 *
 * Financial transactions is now the single ledger. Every farm expense is copied
 * across as an "expense" transaction, then the old table is dropped.
 */
return new class extends Migration
{
    /** Old free-text expense categories -> ledger expense categories. */
    private const CATEGORY_MAP = [
        'seeds' => 'input_cost',
        'seed' => 'input_cost',
        'fertilizer' => 'input_cost',
        'fertiliser' => 'input_cost',
        'chemicals' => 'input_cost',
        'labour' => 'labour_cost',
        'labor' => 'labour_cost',
        'fuel' => 'fuel_cost',
        'machinery' => 'equipment_cost',
        'maintenance' => 'equipment_cost',
        'equipment' => 'equipment_cost',
        'veterinary' => 'vet_cost',
        'vet' => 'vet_cost',
    ];

    public function up(): void
    {
        if (! Schema::hasTable('farm_expenses')) {
            return;
        }

        DB::table('farm_expenses')->orderBy('id')->chunkById(200, function ($expenses) {
            $rows = [];
            foreach ($expenses as $expense) {
                $category = self::CATEGORY_MAP[strtolower(trim($expense->category))] ?? 'other_expense';
                // keep the original wording when the category had to be generalised
                $description = $expense->description;
                if ($category === 'other_expense' && strtolower(trim($expense->category)) !== 'other') {
                    $description = trim($expense->category . ($description ? ': ' . $description : ''));
                }

                $rows[] = [
                    'farm_id' => $expense->farm_id,
                    'amount' => $expense->amount,
                    'type' => 'expense',
                    'category' => $category,
                    'transaction_date' => $expense->expense_date,
                    'description' => $description ? mb_substr($description, 0, 255) : null,
                    'created_at' => $expense->created_at,
                    'updated_at' => $expense->updated_at,
                ];
            }
            DB::table('financial_transactions')->insert($rows);
        });

        Schema::dropIfExists('farm_expenses');
    }

    public function down(): void
    {
        if (Schema::hasTable('farm_expenses')) {
            return;
        }

        Schema::create('farm_expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->constrained()->onDelete('cascade');
            $table->string('category');
            $table->decimal('amount', 12, 2);
            $table->string('description')->nullable();
            $table->date('expense_date');
            $table->timestamps();
        });
        // Rows are not copied back: the finance ledger is now the source of truth.
    }
};

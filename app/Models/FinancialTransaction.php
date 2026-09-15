<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FinancialTransaction extends Model
{
    use HasFactory;

    /**
     * Which categories are valid for each transaction type.
     * Used by the controller to enforce category/type compatibility.
     */
    public const EXPENSE_CATEGORIES = [
        'input_cost',
        'labour_cost',
        'fuel_cost',
        'equipment_cost',
        'vet_cost',
        'loan_repayment',
        'other_expense',
    ];

    public const INCOME_CATEGORIES = [
        'sale_income',
        'loan_received',
        'other_income',
    ];

    protected $fillable = [
        'farm_id',
        'field_id',
        'employee_id',
        'livestock_id',
        'resource_transaction_id',
        'type',
        'category',
        'description',
        'amount',
        'transaction_date',
        'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'transaction_date' => 'date',
        ];
    }

    public function farm()
    {
        return $this->belongsTo(Farm::class);
    }

    public function field()
    {
        return $this->belongsTo(Field::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function livestock()
    {
        return $this->belongsTo(Livestock::class);
    }

    public function resourceTransaction()
    {
        return $this->belongsTo(ResourceTransaction::class);
    }

    public function recordedBy()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}

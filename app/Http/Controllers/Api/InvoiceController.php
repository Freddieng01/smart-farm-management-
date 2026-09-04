<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use Illuminate\Http\Request;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        $query = Invoice::query();

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        return response()->json($query->with(['salesOrder', 'payments'])->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'sales_order_id' => 'required|exists:sales_orders,id',
            'invoice_number' => 'required|string|max:255|unique:invoices,invoice_number',
            'total_amount' => 'required|numeric',
            'due_date' => 'nullable|date',
            'status' => 'nullable|in:Unpaid,Partially Paid,Paid',
        ]);

        $invoice = Invoice::create($validated);

        return response()->json($invoice, 201);
    }

    public function show(Invoice $invoice)
    {
        return response()->json($invoice->load(['salesOrder', 'payments']));
    }

    public function update(Request $request, Invoice $invoice)
    {
        $validated = $request->validate([
            'total_amount' => 'sometimes|numeric',
            'due_date' => 'nullable|date',
            'status' => 'sometimes|in:Unpaid,Partially Paid,Paid',
        ]);

        $invoice->update($validated);

        return response()->json($invoice);
    }

    public function destroy(Invoice $invoice)
    {
        $invoice->delete();

        return response()->json(null, 204);
    }
}
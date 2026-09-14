<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use App\Models\SupplierQuotation;
use Illuminate\Http\Request;

class SupplierQuotationController extends Controller
{
    public function index(Supplier $supplier)
    {
        return response()->json($supplier->quotations);
    }

    public function store(Request $request, Supplier $supplier)
    {
        $validated = $request->validate([
            'item_name' => 'required|string|max:255',
            'quoted_price' => 'required|numeric',
            'unit' => 'nullable|string|max:255',
            'quotation_date' => 'required|date',
            'valid_until' => 'nullable|date',
        ]);

        $quotation = $supplier->quotations()->create($validated);

        return response()->json($quotation, 201);
    }

    public function show(SupplierQuotation $supplierQuotation)
    {
        return response()->json($supplierQuotation);
    }

    public function update(Request $request, SupplierQuotation $supplierQuotation)
    {
        $validated = $request->validate([
            'item_name' => 'sometimes|string|max:255',
            'quoted_price' => 'sometimes|numeric',
            'unit' => 'nullable|string|max:255',
            'quotation_date' => 'sometimes|date',
            'valid_until' => 'nullable|date',
        ]);

        $supplierQuotation->update($validated);

        return response()->json($supplierQuotation);
    }

    public function destroy(SupplierQuotation $supplierQuotation)
    {
        $supplierQuotation->delete();

        return response()->json(null, 204);
    }
}
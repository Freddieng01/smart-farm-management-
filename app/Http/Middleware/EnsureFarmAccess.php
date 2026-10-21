<?php

namespace App\Http\Middleware;

use App\Models\Field;
use App\Models\Farm;
use App\Models\Employee;
use App\Models\Invoice;
use App\Models\Planting;
use App\Models\PurchaseOrder;
use App\Models\SalesOrder;
use App\Models\Supplier;
use App\Support\Authorization\FarmAccess;
use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class EnsureFarmAccess
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        foreach ($request->route()?->parameters() ?? [] as $parameter) {
            if ($parameter instanceof Model) {
                FarmAccess::authorizeModel($parameter);
            }
        }

        if ($request->filled('farm_id')) {
            FarmAccess::authorizeFarm((int) $request->input('farm_id'));
        }

        foreach ([
            'field_id' => Field::class,
            'employee_id' => Employee::class,
            'planting_id' => Planting::class,
            'supplier_id' => Supplier::class,
            'purchase_order_id' => PurchaseOrder::class,
            'sales_order_id' => SalesOrder::class,
            'invoice_id' => Invoice::class,
        ] as $key => $modelClass) {
            if ($request->filled($key)) {
                $model = $modelClass::findOrFail($request->input($key));
                FarmAccess::authorizeModel($model);
            }
        }

        if ($request->filled('owner_id')
            && $request->route('farm') instanceof Farm
            && $user->role !== 'Admin') {
            return response()->json(['message' => 'Only an Admin may transfer farm ownership.'], 403);
        }

        return $next($request);
    }
}

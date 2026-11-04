<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RoleAccess
{
    /**
     * STRICT ROLE DEFINITIONS
     * Only roles explicitly listed here can access the module.
     */
    private const ROLES = [
        'farms'       => ['Admin', 'Farm-owner', 'Manager'],
        'fields'      => ['Admin', 'Farm-owner', 'Manager', 'Agronomist'],
        'employees'    => ['Farm-owner', 'Manager'],
        'tasks'       => ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'],
        'agronomy'    => ['Admin', 'Farm-owner', 'Manager', 'Agronomist'],
        'operations'   => ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'],
        'inventory'   => ['Admin', 'Farm-owner', 'Manager', 'Agronomist'],
        'equipment'   => ['Admin', 'Farm-owner', 'Manager'],
        'finance'     => ['Farm-owner', 'Manager', 'Accountant'],
        'commercial'   => ['Farm-owner', 'Manager', 'Accountant'],
        'storage'     => ['Admin', 'Farm-owner', 'Manager', 'Accountant', 'Worker'],
        'weather'     => ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker', 'Accountant'],
        'notifications' => ['Admin', 'Farm-owner', 'Manager', 'Accountant', 'Agronomist', 'Worker'],
    ];

    public function handle(Request $request, Closure $next, string $module)
    {
        $user = $request->user();

        if (! $user || ! in_array($user->role, self::ROLES[$module] ?? [], true)) {
            return response()->json(['message' => 'Module unavailable.'], 403);
        }

        // Prevent non-privileged roles from modifying data.
        // Only Farm-owner and Manager can perform "write" operations (POST, PUT, PATCH, DELETE)
        // on core farm settings and fields.
        if (! in_array($request->method(), ['GET', 'HEAD'], true)) {
            if ($module === 'notifications'
                && $request->isMethod('POST')
                && str_ends_with($request->path(), '/mark-as-read')) {
                return $next($request);
            }

            if (! in_array($user->role, ['Farm-owner', 'Manager'], true)) {
                return response()->json([
                    'message' => 'Unauthorized Action: You may only view this data. Please contact the Farm Owner to make changes.'
                ], 403);
            }
        }

        return $next($request);
    }
}

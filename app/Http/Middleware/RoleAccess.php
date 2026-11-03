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
        'fields'      => ['Farm-owner', 'Manager', 'Agronomist'], 
        'employees'    => ['Farm-owner', 'Manager'],
        'tasks'       => ['Farm-owner', 'Manager', 'Agronomist', 'Worker'],
        'agronomy'    => ['Farm-owner', 'Manager', 'Agronomist'],
        'operations'   => ['Farm-owner', 'Manager', 'Agronomist', 'Worker'],
        'finance'     => ['Farm-owner', 'Manager', 'Accountant'],
        'commercial'   => ['Farm-owner', 'Manager', 'Accountant'],
        'storage'     => ['Farm-owner', 'Manager', 'Accountant', 'Worker'],
        'weather'     => ['Farm-owner', 'Manager', 'Agronomist', 'Worker', 'Accountant'],
        'notifications' => ['Admin', 'Farm-owner', 'Manager', 'Accountant', 'Agronomist', 'Worker'],
    ];

    public function handle(Request $request, Closure $next, string $module)
    {
        $user = $request->user();
        
        // 1. Basic Role Check: Does this role have ANY access to this module?
        if (! $user || ! in_array($user->role, self::ROLES[$module] ?? [], true)) {
            return response()->json(['message' => 'Access Denied: Your role does not have access to this module.'], 403);
        }

        // 2. Action-Based Restriction: Prevent non-privileged roles from modifying data.
        // Only Farm-owner and Manager can perform "write" operations (POST, PUT, PATCH, DELETE)
        // on core farm settings and fields.
        if (! in_array($request->method(), ['GET', 'HEAD'], true)) {
            if (! in_array($user->role, ['Farm-owner', 'Manager'], true)) {
                return response()->json([
                    'message' => 'Unauthorized Action: You may only view this data. Please contact the Farm Owner to make changes.'
                ], 403);
            }
        }

        return $next($request);
    }
}

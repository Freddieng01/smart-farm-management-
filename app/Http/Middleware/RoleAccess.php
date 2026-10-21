<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RoleAccess
{
    private const ROLES = [
        'farms' => ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Accountant', 'Worker'],
        'fields' => ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'],
        'employees' => ['Admin', 'Farm-owner', 'Manager'],
        'tasks' => ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'],
        'agronomy' => ['Admin', 'Farm-owner', 'Manager', 'Agronomist'],
        'operations' => ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'],
        'finance' => ['Admin', 'Farm-owner', 'Manager', 'Accountant'],
        'commercial' => ['Admin', 'Farm-owner', 'Manager', 'Accountant'],
        'storage' => ['Admin', 'Farm-owner', 'Manager', 'Accountant', 'Worker'],
        'weather' => ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'],
        'notifications' => ['Admin', 'Farm-owner', 'Manager', 'Accountant', 'Agronomist', 'Worker'],
    ];

    public function handle(Request $request, Closure $next, string $module)
    {
        $user = $request->user();
        if (! $user || ! in_array($user->role, self::ROLES[$module] ?? [], true)) {
            return response()->json(['message' => 'You do not have permission to access this module.'], 403);
        }

        if ($module === 'farms'
            && ! in_array($request->method(), ['GET', 'HEAD'], true)
            && ! in_array($user->role, ['Admin', 'Farm-owner', 'Manager'], true)) {
            return response()->json(['message' => 'You may only view farms.'], 403);
        }

        return $next($request);
    }
}

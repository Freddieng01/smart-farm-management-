<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RoleAccess
{
    private const ROLES = [
        'farms' => ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Accountant', 'Worker'],
        'fields' => ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'],
        'employees' => ['Farm-owner', 'Manager'],
        'tasks' => ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'],
        'agronomy' => ['Admin', 'Farm-owner', 'Manager', 'Agronomist'],
        'operations' => ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'],
        'finance' => ['Farm-owner', 'Manager', 'Accountant'],
        'commercial' => ['Farm-owner', 'Manager', 'Accountant'],
        'storage' => ['Admin', 'Farm-owner', 'Manager', 'Accountant', 'Worker'],
        'weather' => ['Admin', 'Farm-owner', 'Manager', 'Agronomist', 'Worker'],
        'notifications' => ['Admin', 'Farm-owner', 'Manager', 'Accountant', 'Agronomist', 'Worker'],
    ];

    /**
     * Admins run the system (users, invitations, farms and owners). Farm owners keep
     * their privacy, so Admins are kept out of employees, finance and commercial data
     * completely, and get VIEW-ONLY access to the modules below.
     * To block Admin from a module completely, delete 'Admin' from that module's row in ROLES.
     * To give Admin write access to a module again, remove it from this list.
     */
    private const ADMIN_VIEW_ONLY = ['fields', 'tasks', 'agronomy', 'operations', 'storage', 'weather'];

    public function handle(Request $request, Closure $next, string $module)
    {
        $user = $request->user();
        if (! $user || ! in_array($user->role, self::ROLES[$module] ?? [], true)) {
            return response()->json(['message' => 'You do not have permission to access this module.'], 403);
        }

        if ($user->role === 'Admin'
            && in_array($module, self::ADMIN_VIEW_ONLY, true)
            && ! in_array($request->method(), ['GET', 'HEAD'], true)) {
            return response()->json(['message' => 'Admins have view-only access to farm records. Ask the farm owner to make this change.'], 403);
        }

        if ($module === 'farms'
            && ! in_array($request->method(), ['GET', 'HEAD'], true)
            && ! in_array($user->role, ['Admin', 'Farm-owner', 'Manager'], true)) {
            return response()->json(['message' => 'You may only view farms.'], 403);
        }

        return $next($request);
    }
}

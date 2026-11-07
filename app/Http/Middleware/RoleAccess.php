<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RoleAccess
{
    public function handle(Request $request, Closure $next, string $module)
    {
        $user = $request->user();
        $roles = config("permissions.modules.{$module}", []);

        if (! $user || ! in_array($user->role, $roles, true)) {
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

            $writeRoles = config("permissions.write_roles.{$module}", []);
            if (! in_array($user->role, $writeRoles, true)) {
                return response()->json([
                    'message' => 'Unauthorized Action: You may only view this data. Please contact the Farm Owner to make changes.'
                ], 403);
            }
        }

        return $next($request);
    }
}

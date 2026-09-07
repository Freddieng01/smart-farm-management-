<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CheckRole
{
    public function handle(Request $request, Closure $next, ...$roles)
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthorized access for this role.'], 403);
        }

        $userRole = (string) ($user->role ?? '');
        $allowedRoles = array_map('strval', $roles);

        if (! in_array($userRole, $allowedRoles, true)) {
            return response()->json(['message' => 'Unauthorized access for this role.'], 403);
        }

        return $next($request);
    }
}

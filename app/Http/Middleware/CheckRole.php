<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CheckRole
{
    /**
     * Handle an incoming request.
     * Accepts multiple role parameters (e.g., role:Admin,Moderator)
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @param  mixed  ...$roles
     * @return mixed
     */
    public function handle(Request $request, Closure $next, ...$roles)
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthorized access for this role.'], 403);
        }

        // Normalize roles and user's role for comparison
        $normalizedRoles = array_map('strval', $roles);
        $userRole = (string) ($user->role ?? '');

        if (! in_array($userRole, $normalizedRoles, true)) {
            return response()->json(['message' => 'Unauthorized access for this role.'], 403);
        }

        return $next($request);
    }
}

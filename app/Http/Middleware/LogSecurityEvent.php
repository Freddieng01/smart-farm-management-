<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LogSecurityEvent
{
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        // Log security-relevant events
        if ($this->isSecurityEvent($request, $response)) {
            $this->logEvent($request, $response);
        }

        return $response;
    }

    protected function isSecurityEvent(Request $request, $response): bool
    {
        $sensitiveRoutes = [
            'api/login',
            'api/logout',
            'api/register',
            'api/users',
        ];

        foreach ($sensitiveRoutes as $route) {
            if ($request->is($route)) {
                return true;
            }
        }

        return false;
    }

    protected function logEvent(Request $request, $response): void
    {
        $event = [
            'timestamp' => now()->toIso8601String(),
            'event_type' => $this->getEventType($request),
            'user_id' => auth()->id(),
            'user_email' => auth()->user()?->email,
            'user_role' => auth()->user()?->role,
            'method' => $request->method(),
            'path' => $request->path(),
            'ip_address' => $request->ip(),
            'status_code' => $response->status(),
            'user_agent' => $request->userAgent(),
        ];

        // Log failed authentication attempts
        if ($request->is('api/login') && $response->status() !== 200) {
            $event['failure_reason'] = 'Invalid credentials';
        }

        // Write to audit log file
        Log::channel('audit')->info(json_encode($event));

        // Optionally store in database for querying
        try {
            DB::table('audit_logs')->insert([
                'user_id' => auth()->id(),
                'event_type' => $event['event_type'],
                'route' => $request->path(),
                'method' => $request->method(),
                'status_code' => $response->status(),
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Exception $e) {
            // Audit table may not exist, continue
            Log::debug('Audit table not available: ' . $e->getMessage());
        }
    }

    protected function getEventType(Request $request): string
    {
        if ($request->is('api/login')) {
            return 'auth.login';
        }
        if ($request->is('api/logout')) {
            return 'auth.logout';
        }
        if ($request->is('api/register')) {
            return 'auth.register';
        }
        if ($request->is('api/users') && $request->isMethod('post')) {
            return 'user.create';
        }
        if ($request->is('api/users/*') && $request->isMethod('put')) {
            return 'user.update';
        }
        if ($request->is('api/users/*') && $request->isMethod('delete')) {
            return 'user.delete';
        }

        return 'security.event';
    }
}

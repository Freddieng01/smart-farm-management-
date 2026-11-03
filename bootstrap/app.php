<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append(\App\Http\Middleware\LogSecurityEvent::class);
        $middleware->alias([
            'role' => \App\Http\Middleware\CheckRole::class,
            'farm.access' => \App\Http\Middleware\EnsureFarmAccess::class,
            'module' => \App\Http\Middleware\RoleAccess::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Global handler to prevent technical leaks to the user
        $exceptions->render(function (\Throwable $e, Request $request) {
            if ($request->is('api/*')) {
                \Illuminate\Support\Facades\Log::error('[API ERROR] ' . $e->getMessage(), [
                    'exception' => get_class($e),
                    'trace' => $e->getTraceAsString(),
                ]);

                $status = $e instanceof HttpException ? $e->getStatusCode() : 500;
                
                return response()->json([
                    'status' => 'error',
                    'message' => $status == 500 
                        ? 'A system error occurred. Please try again later.' 
                        : $e->getMessage(),
                ], $status);
            }
        });
    })->create();

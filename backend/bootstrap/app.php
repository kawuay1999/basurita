<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Auth\AuthenticationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Alias usado en routes/api.php: ->middleware('role:administrador')
        $middleware->alias([
            'role' => \App\Http\Middleware\CheckRole::class,
        ]);

        // En un hosting (Railway, Render, etc.) la app va detrás de un proxy con HTTPS:
        // así Laravel reconoce que la petición original era https.
        $middleware->trustProxies(at: '*');
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Interceptar errores en rutas API para devolver JSON amigable
        $exceptions->render(function (Throwable $e, Request $request) {
            if ($request->is('api/*')) {
                if ($e instanceof ValidationException) {
                    return response()->json([
                        'exito' => false,
                        // Muestra el primer error concreto (ej. "Ese correo ya está registrado.")
                        'mensaje' => collect($e->errors())->flatten()->first() ?? 'Verifica los datos ingresados e intenta de nuevo.',
                        'errores' => $e->errors()
                    ], 422);
                }

                if ($e instanceof AuthenticationException) {
                    return response()->json([
                        'exito' => false,
                        'mensaje' => 'Tu sesión ha expirado. Inicia sesión nuevamente.'
                    ], 401);
                }

                if ($e instanceof NotFoundHttpException) {
                    return response()->json([
                        'exito' => false,
                        'mensaje' => 'La información solicitada no fue encontrada.'
                    ], 404);
                }

                // Cualquier error inesperado del servidor (sin exponer excepciones)
                return response()->json([
                    'exito' => false,
                    'mensaje' => 'Ocurrió un problema temporal al procesar tu solicitud. Intenta más tarde.'
                ], 500);
            }
        });
    })->create();
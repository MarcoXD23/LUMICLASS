<?php

use App\Http\RespuestaError;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // Errores de la API siempre como {"error": {"codigo", "mensaje"}} y en español.
        $esApi = fn (Request $request) => $request->is('api/*');

        $exceptions->render(fn (ValidationException $e, Request $request) => $esApi($request)
            ? RespuestaError::json('datos_invalidos', 'Los datos enviados no son válidos.', 400, $e->errors())
            : null);

        $exceptions->render(fn (NotFoundHttpException $e, Request $request) => $esApi($request)
            ? RespuestaError::json('no_encontrado', 'El recurso solicitado no existe.', 404)
            : null);

        $exceptions->render(fn (MethodNotAllowedHttpException $e, Request $request) => $esApi($request)
            ? RespuestaError::json('metodo_no_permitido', 'Este método HTTP no está permitido en esta ruta.', 405)
            : null);

        $exceptions->render(fn (HttpExceptionInterface $e, Request $request) => $esApi($request)
            ? RespuestaError::json('error_http', $e->getMessage() ?: 'No se pudo procesar la solicitud.', $e->getStatusCode())
            : null);

        // Cualquier otro fallo: sin detalles internos (quedan en storage/logs).
        $exceptions->render(fn (Throwable $e, Request $request) => $esApi($request) && ! config('app.debug')
            ? RespuestaError::json('error_interno', 'Ocurrió un error interno. Intenta de nuevo.', 500)
            : null);
    })->create();

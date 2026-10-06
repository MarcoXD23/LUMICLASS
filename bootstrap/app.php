<?php

use App\Http\RespuestaError;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
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
        // El frontend (mismo dominio, puerto 8001) usa la cookie de sesión; scripts y placa usan token.
        $middleware->statefulApi();

        // Páginas web: sin sesión van a ingresar; con sesión, "ingresar" y "registro" llevan a sus salones.
        $middleware->redirectGuestsTo('/ingresar');
        $middleware->redirectUsersTo('/salones');
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

        $exceptions->render(fn (AuthenticationException $e, Request $request) => $esApi($request)
            ? RespuestaError::json('no_autenticado', 'Inicia sesión para continuar.', 401)
            : null);

        $exceptions->render(fn (ThrottleRequestsException $e, Request $request) => $esApi($request)
            ? RespuestaError::json('demasiados_intentos', 'Demasiados intentos. Espera un minuto y vuelve a probar.', 429)
                ->withHeaders($e->getHeaders())
            : null);

        $exceptions->render(fn (NotFoundHttpException $e, Request $request) => $esApi($request)
            ? RespuestaError::json('no_encontrado', 'El recurso solicitado no existe.', 404)
            : null);

        $exceptions->render(fn (MethodNotAllowedHttpException $e, Request $request) => $esApi($request)
            ? RespuestaError::json('metodo_no_permitido', 'Este método HTTP no está permitido en esta ruta.', 405)
            : null);

        $exceptions->render(fn (HttpExceptionInterface $e, Request $request) => match (true) {
            ! $esApi($request) => null,
            // 419: falta el token CSRF o la sesión del navegador expiró.
            $e->getStatusCode() === 419 => RespuestaError::json('sesion_expirada', 'La sesión expiró o falta el token de seguridad. Recarga la página e inicia sesión de nuevo.', 419),
            default => RespuestaError::json('error_http', $e->getMessage() ?: 'No se pudo procesar la solicitud.', $e->getStatusCode()),
        });

        // Cualquier otro fallo: sin detalles internos (quedan en storage/logs).
        $exceptions->render(fn (Throwable $e, Request $request) => $esApi($request) && ! config('app.debug')
            ? RespuestaError::json('error_interno', 'Ocurrió un error interno. Intenta de nuevo.', 500)
            : null);
    })->create();

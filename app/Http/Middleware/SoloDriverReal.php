<?php

namespace App\Http\Middleware;

use App\Http\RespuestaError;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** La API de la placa solo existe con LUMICLASS_DRIVER=real: así nunca se mezclan datos reales con el simulador. */
class SoloDriverReal
{
    public function handle(Request $request, Closure $next): Response
    {
        if (config('lumiclass.driver') !== 'real') {
            return RespuestaError::json('driver_simulado', 'La API de la placa solo funciona con LUMICLASS_DRIVER=real.', 404);
        }

        return $next($request);
    }
}

<?php

namespace App\Http\Middleware;

use App\Http\RespuestaError;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Las rutas /sim solo existen con LUMICLASS_DRIVER=simulado: nunca se fuerzan datos con hardware real. */
class SoloSimulador
{
    public function handle(Request $request, Closure $next): Response
    {
        if (config('lumiclass.driver') !== 'simulado') {
            return RespuestaError::json('simulador_desactivado', 'El simulador solo está disponible con LUMICLASS_DRIVER=simulado.', 404);
        }

        return $next($request);
    }
}

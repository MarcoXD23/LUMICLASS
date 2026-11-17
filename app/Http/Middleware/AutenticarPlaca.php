<?php

namespace App\Http\Middleware;

use App\Http\RespuestaError;
use App\Models\Placa;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** "Authorization: Bearer <clave de la placa>". Deja la placa en $request->attributes('placa'). */
class AutenticarPlaca
{
    public function handle(Request $request, Closure $next): Response
    {
        $placa = Placa::conClave($request->bearerToken());

        if ($placa === null) {
            return RespuestaError::json('clave_invalida', 'Clave de placa inválida. Genera una nueva en "Configurar salón" → "Conectar placa".', 401);
        }

        $request->attributes->set('placa', $placa);

        return $next($request);
    }
}

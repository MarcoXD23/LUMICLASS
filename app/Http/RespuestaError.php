<?php

namespace App\Http;

use Illuminate\Http\JsonResponse;

/** Formato único de error de la API: {"error": {"codigo", "mensaje", "detalles"?}}. */
final class RespuestaError
{
    /** @param  array<string, mixed>|null  $detalles */
    public static function json(string $codigo, string $mensaje, int $estadoHttp, ?array $detalles = null): JsonResponse
    {
        $error = ['codigo' => $codigo, 'mensaje' => $mensaje];

        if ($detalles !== null) {
            $error['detalles'] = $detalles;
        }

        return response()->json(['error' => $error], $estadoHttp);
    }
}

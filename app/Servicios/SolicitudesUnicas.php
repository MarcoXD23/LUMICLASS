<?php

namespace App\Servicios;

use App\Http\RespuestaError;
use App\Models\SolicitudProcesada;
use Closure;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Evita ejecutar dos veces la misma orden (doble clic, reintento por red lenta). El id es único por usuario.
 * Solo se guardan respuestas exitosas: si una orden fue rechazada, reintentarla la evalúa de nuevo.
 */
class SolicitudesUnicas
{
    /** @param  Closure(): JsonResponse  $accion */
    public function ejecutarUnaVez(Request $request, string $idSolicitud, Closure $accion): JsonResponse
    {
        $ruta = $request->method().' '.$request->path();
        $userId = $request->user()?->id;
        $buscar = fn () => SolicitudProcesada::query()->where('user_id', $userId)->where('id_solicitud', $idSolicitud)->first();

        $previa = $buscar();
        if ($previa !== null) {
            return $this->repetir($previa, $ruta);
        }

        $respuesta = $accion();

        if ($respuesta->isSuccessful()) {
            try {
                SolicitudProcesada::create([
                    'user_id' => $userId,
                    'id_solicitud' => $idSolicitud,
                    'ruta' => $ruta,
                    'codigo_http' => $respuesta->getStatusCode(),
                    'respuesta' => $respuesta->getData(true),
                ]);
            } catch (UniqueConstraintViolationException) {
                // Otra petición idéntica terminó al mismo tiempo: se responde lo que ella guardó.
                return $this->repetir($buscar(), $ruta);
            }
        }

        return $respuesta;
    }

    private function repetir(SolicitudProcesada $previa, string $ruta): JsonResponse
    {
        if ($previa->ruta !== $ruta) {
            return RespuestaError::json(
                'id_solicitud_reutilizado',
                'Ese id_solicitud ya se usó para otra orden. Genera uno nuevo.',
                409,
            );
        }

        return response()
            ->json($previa->respuesta, $previa->codigo_http)
            ->header('X-Solicitud-Repetida', 'true');
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ZonaResource;
use App\Http\RespuestaError;
use App\Models\Salon;
use App\Servicios\EstadoSalon;
use Illuminate\Http\JsonResponse;

class SalonController extends Controller
{
    /** Todo el dashboard en una sola llamada. */
    public function estado(EstadoSalon $estadoSalon): JsonResponse
    {
        $salon = Salon::query()
            ->with(['zonas' => fn ($q) => $q->orderBy('id'), 'zonas.luces.actuador', 'zonas.sensores'])
            ->orderBy('id')
            ->first();

        if ($salon === null) {
            return RespuestaError::json(
                'sin_salon',
                'No hay ningún salón configurado. Ejecuta: php artisan db:seed',
                404,
            );
        }

        return response()->json([
            'data' => [
                'salon' => ['id' => $salon->id, 'nombre' => $salon->nombre],
                ...$estadoSalon->resumen($salon),
                'alertas' => $estadoSalon->alertas($salon),
                'zonas' => ZonaResource::collection($salon->zonas)->resolve(),
            ],
        ]);
    }
}

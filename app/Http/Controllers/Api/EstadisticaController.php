<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\EstadisticasRequest;
use App\Models\Salon;
use App\Servicios\EstadisticasSalon;
use Illuminate\Http\JsonResponse;

class EstadisticaController extends Controller
{
    public function __invoke(EstadisticasRequest $request, Salon $salon, EstadisticasSalon $estadisticas): JsonResponse
    {
        [$desde, $hasta] = $request->periodo();

        return response()->json([
            'data' => [
                'rango' => $request->rango(),
                ...$estadisticas->calcular($salon, $desde, $hasta, $request->zonaHoraria()),
            ],
        ]);
    }
}

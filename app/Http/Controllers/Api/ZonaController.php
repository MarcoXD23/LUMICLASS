<?php

namespace App\Http\Controllers\Api;

use App\Enums\OrigenEvento;
use App\Http\Controllers\Controller;
use App\Http\Requests\CambiarModoRequest;
use App\Http\Requests\ComandoLuzRequest;
use App\Http\Resources\ZonaResource;
use App\Models\Salon;
use App\Models\Zona;
use App\Servicios\ServicioLuces;
use App\Servicios\ServicioZonas;
use App\Servicios\SolicitudesUnicas;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ZonaController extends Controller
{
    private const RELACIONES = ['luces.actuador', 'sensores'];

    public function index(Salon $salon): AnonymousResourceCollection
    {
        return ZonaResource::collection($salon->zonas()->with(self::RELACIONES)->orderBy('id')->get());
    }

    public function show(Zona $zona): ZonaResource
    {
        return ZonaResource::make($zona->load(self::RELACIONES));
    }

    public function modo(CambiarModoRequest $request, Zona $zona, ServicioZonas $zonas): JsonResponse
    {
        $cambio = $zonas->cambiarModo($zona, $request->modo(), OrigenEvento::Usuario);

        return response()->json([
            'data' => ZonaResource::make($zona->load(self::RELACIONES))->resolve(),
            'cambio' => $cambio,
            'mensaje' => $cambio
                ? "La zona \"{$zona->nombre}\" pasó a modo {$zona->modo->value}."
                : "La zona \"{$zona->nombre}\" ya estaba en modo {$zona->modo->value}.",
        ]);
    }

    /** Responde 200 aunque alguna luz sea rechazada: el detalle va en "resultados". */
    public function comando(ComandoLuzRequest $request, Zona $zona, ServicioLuces $luces, SolicitudesUnicas $solicitudes): JsonResponse
    {
        return $solicitudes->ejecutarUnaVez($request, $request->idSolicitud(), function () use ($request, $zona, $luces) {
            $resultados = $luces->comandarZona($zona, $request->accion(), OrigenEvento::Usuario);

            return response()->json([
                'data' => ZonaResource::make($zona->fresh(self::RELACIONES))->resolve(),
                'resultados' => $resultados,
            ]);
        });
    }
}

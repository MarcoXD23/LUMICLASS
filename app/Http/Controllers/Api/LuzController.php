<?php

namespace App\Http\Controllers\Api;

use App\Enums\EstadoOrden;
use App\Enums\OrigenEvento;
use App\Http\Controllers\Controller;
use App\Http\Requests\ComandoLuzRequest;
use App\Http\Resources\LuzResource;
use App\Models\Luz;
use App\Models\Salon;
use App\Servicios\ServicioLuces;
use App\Servicios\SolicitudesUnicas;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class LuzController extends Controller
{
    public function index(Salon $salon): AnonymousResourceCollection
    {
        return LuzResource::collection($salon->luces()->with('actuador')->orderBy('luces.id')->get());
    }

    public function show(Luz $luz): LuzResource
    {
        return LuzResource::make($luz->load('actuador'));
    }

    public function comando(ComandoLuzRequest $request, Luz $luz, ServicioLuces $luces, SolicitudesUnicas $solicitudes): JsonResponse
    {
        return $solicitudes->ejecutarUnaVez($request, $request->idSolicitud(), function () use ($request, $luz, $luces) {
            $resultado = $luces->comandarLuz($luz, $request->accion(), OrigenEvento::Usuario);

            // 202 = el servo aún no confirma; el estado real se actualizará en un próximo tick.
            return response()->json([
                'data' => LuzResource::make($resultado->luz)->resolve(),
                'cambio' => $resultado->cambio(),
                'resultado' => $resultado->resultado(),
                'mensaje' => $resultado->mensaje,
            ], $resultado->orden === EstadoOrden::Pendiente ? 202 : 200);
        });
    }
}

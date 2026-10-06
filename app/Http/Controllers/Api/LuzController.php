<?php

namespace App\Http\Controllers\Api;

use App\Enums\OrigenEvento;
use App\Http\Controllers\Controller;
use App\Http\Requests\ComandoLuzRequest;
use App\Http\Resources\LuzResource;
use App\Models\Luz;
use App\Servicios\ServicioLuces;
use App\Servicios\SolicitudesUnicas;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class LuzController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return LuzResource::collection(Luz::query()->with('actuador')->orderBy('id')->get());
    }

    public function show(Luz $luz): LuzResource
    {
        return LuzResource::make($luz->load('actuador'));
    }

    public function comando(ComandoLuzRequest $request, Luz $luz, ServicioLuces $luces, SolicitudesUnicas $solicitudes): JsonResponse
    {
        return $solicitudes->ejecutarUnaVez($request, $request->idSolicitud(), function () use ($request, $luz, $luces) {
            $resultado = $luces->comandarLuz($luz, $request->accion(), OrigenEvento::Usuario);

            return response()->json([
                'data' => LuzResource::make($resultado->luz)->resolve(),
                'cambio' => $resultado->cambio,
                'mensaje' => $resultado->mensaje,
            ]);
        });
    }
}

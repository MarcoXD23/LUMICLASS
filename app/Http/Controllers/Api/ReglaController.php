<?php

namespace App\Http\Controllers\Api;

use App\Enums\OrigenEvento;
use App\Enums\TipoEvento;
use App\Http\Controllers\Controller;
use App\Http\Requests\GuardarReglaRequest;
use App\Http\Resources\ReglaResource;
use App\Models\Regla;
use App\Models\Salon;
use App\Servicios\RegistroEventos;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class ReglaController extends Controller
{
    public function __construct(private readonly RegistroEventos $eventos) {}

    public function index(Salon $salon): AnonymousResourceCollection
    {
        return ReglaResource::collection($salon->reglas()->ordenadas()->get());
    }

    public function show(Regla $regla): ReglaResource
    {
        return ReglaResource::make($regla);
    }

    public function store(GuardarReglaRequest $request, Salon $salon): JsonResponse
    {
        $regla = DB::transaction(function () use ($request, $salon) {
            $regla = $salon->reglas()->create($request->validated());
            $this->eventos->registrar(TipoEvento::ReglaCreada, OrigenEvento::Usuario, "Regla \"{$regla->nombre}\" creada.", $regla);

            return $regla;
        });

        return ReglaResource::make($regla)->response()->setStatusCode(201);
    }

    public function update(GuardarReglaRequest $request, Regla $regla): ReglaResource
    {
        DB::transaction(function () use ($request, $regla) {
            // Sin duracion_segundos en el PUT, la condición nueva no la conserva.
            $regla->fill($request->validated())->save();
            $this->eventos->registrar(TipoEvento::ReglaActualizada, OrigenEvento::Usuario, "Regla \"{$regla->nombre}\" actualizada.", $regla);
        });

        return ReglaResource::make($regla);
    }

    public function destroy(Regla $regla): Response
    {
        DB::transaction(function () use ($regla) {
            $this->eventos->registrar(
                TipoEvento::ReglaEliminada,
                OrigenEvento::Usuario,
                "Regla \"{$regla->nombre}\" eliminada.",
                $regla,
                ['condicion' => $regla->condicion, 'accion' => $regla->accion],
            );
            $regla->delete();
        });

        return response()->noContent();
    }
}

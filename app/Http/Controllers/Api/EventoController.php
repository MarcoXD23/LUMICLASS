<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\FiltrarEventosRequest;
use App\Http\Resources\EventoResource;
use App\Models\Salon;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class EventoController extends Controller
{
    /** Historial, del más reciente al más antiguo. */
    public function index(FiltrarEventosRequest $request, Salon $salon): AnonymousResourceCollection
    {
        $filtros = $request->validated();

        $eventos = $salon->eventos()
            ->when($filtros['tipo'] ?? null, fn ($q, $valor) => $q->where('tipo', $valor))
            ->when($filtros['origen'] ?? null, fn ($q, $valor) => $q->where('origen', $valor))
            ->when($filtros['severidad'] ?? null, fn ($q, $valor) => $q->where('severidad', $valor))
            ->when($filtros['desde'] ?? null, fn ($q, $valor) => $q->whereDate('created_at', '>=', $valor))
            ->when($filtros['hasta'] ?? null, fn ($q, $valor) => $q->whereDate('created_at', '<=', $valor))
            ->orderByDesc('id')
            ->paginate((int) ($filtros['por_pagina'] ?? 20))
            ->withQueryString();

        return EventoResource::collection($eventos);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\FiltrarEventosRequest;
use App\Http\Resources\EventoResource;
use App\Models\Evento;
use App\Models\Salon;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EventoController extends Controller
{
    /** Máximo de filas del CSV: suficiente para un informe y evita archivos gigantes. */
    public const MAXIMO_CSV = 10000;

    /** Historial, del más reciente al más antiguo. */
    public function index(FiltrarEventosRequest $request, Salon $salon): AnonymousResourceCollection
    {
        $eventos = $this->filtrados($request, $salon)
            ->paginate((int) $request->validated('por_pagina', 20))
            ->withQueryString();

        return EventoResource::collection($eventos);
    }

    /** Mismo historial y filtros, como CSV para abrir en Excel (separador ";" y UTF-8 con BOM). */
    public function csv(FiltrarEventosRequest $request, Salon $salon): StreamedResponse
    {
        $consulta = $this->filtrados($request, $salon)->limit(self::MAXIMO_CSV);
        $nombre = 'historial-'.Str::slug($salon->nombre).'-'.now()->format('Y-m-d').'.csv';

        return response()->streamDownload(function () use ($consulta) {
            $salida = fopen('php://output', 'w');
            fwrite($salida, "\xEF\xBB\xBF");
            fputcsv($salida, ['fecha_utc', 'tipo', 'origen', 'severidad', 'mensaje'], ';');

            foreach ($consulta->lazy() as $evento) {
                /** @var Evento $evento */
                fputcsv($salida, [
                    $evento->created_at?->toDateTimeString(),
                    $evento->tipo->value,
                    $evento->origen->value,
                    $evento->severidad->value,
                    $evento->mensaje,
                ], ';');
            }

            fclose($salida);
        }, $nombre, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /** @return HasMany<Evento, Salon> */
    private function filtrados(FiltrarEventosRequest $request, Salon $salon): HasMany
    {
        $filtros = $request->validated();

        return $salon->eventos()
            ->when($filtros['tipo'] ?? null, fn ($q, $valor) => $q->where('tipo', $valor))
            ->when($filtros['origen'] ?? null, fn ($q, $valor) => $q->where('origen', $valor))
            ->when($filtros['severidad'] ?? null, fn ($q, $valor) => $q->where('severidad', $valor))
            ->when($filtros['desde'] ?? null, fn ($q, $valor) => $q->whereDate('created_at', '>=', $valor))
            ->when($filtros['hasta'] ?? null, fn ($q, $valor) => $q->whereDate('created_at', '<=', $valor))
            ->orderByDesc('id');
    }
}

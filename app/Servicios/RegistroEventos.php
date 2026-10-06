<?php

namespace App\Servicios;

use App\Enums\OrigenEvento;
use App\Enums\SeveridadEvento;
use App\Enums\TipoEvento;
use App\Models\Evento;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/** Punto único para escribir en el historial. */
class RegistroEventos
{
    /** @param  array<string, mixed>  $datos */
    public function registrar(
        TipoEvento $tipo,
        OrigenEvento $origen,
        string $mensaje,
        ?Model $entidad = null,
        array $datos = [],
        SeveridadEvento $severidad = SeveridadEvento::Info,
    ): Evento {
        return Evento::create([
            'tipo' => $tipo,
            'origen' => $origen,
            'severidad' => $severidad,
            'entidad_tipo' => $entidad ? Str::snake(class_basename($entidad)) : null,
            'entidad_id' => $entidad?->getKey(),
            'mensaje' => Str::limit($mensaje, 250),
            'datos' => $datos ?: null,
        ]);
    }
}

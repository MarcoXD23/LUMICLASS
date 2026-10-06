<?php

namespace App\Servicios;

use App\Enums\OrigenEvento;
use App\Enums\SeveridadEvento;
use App\Enums\TipoEvento;
use App\Models\Actuador;
use App\Models\Evento;
use App\Models\Luz;
use App\Models\Regla;
use App\Models\Salon;
use App\Models\Sensor;
use App\Models\Zona;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/** Punto único para escribir en el historial. Cada evento queda asociado al salón de su entidad. */
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
        ?Salon $salon = null,
    ): Evento {
        return Evento::create([
            'salon_id' => $salon?->id ?? $this->salonDe($entidad),
            'tipo' => $tipo,
            'origen' => $origen,
            'severidad' => $severidad,
            'entidad_tipo' => $entidad ? Str::snake(class_basename($entidad)) : null,
            'entidad_id' => $entidad?->getKey(),
            'mensaje' => Str::limit($mensaje, 250),
            'datos' => $datos ?: null,
        ]);
    }

    private function salonDe(?Model $entidad): ?int
    {
        return match (true) {
            $entidad instanceof Salon => $entidad->id,
            $entidad instanceof Zona, $entidad instanceof Actuador, $entidad instanceof Regla => $entidad->salon_id,
            $entidad instanceof Luz, $entidad instanceof Sensor => $entidad->zona?->salon_id,
            default => null,
        };
    }
}

<?php

namespace App\Http\Resources;

use App\Models\Evento;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Evento */
class EventoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'fecha' => $this->created_at?->toIso8601String(),
            'tipo' => $this->tipo->value,
            'origen' => $this->origen->value,
            'severidad' => $this->severidad->value,
            'entidad_tipo' => $this->entidad_tipo,
            'entidad_id' => $this->entidad_id,
            'mensaje' => $this->mensaje,
            'datos' => $this->datos,
        ];
    }
}

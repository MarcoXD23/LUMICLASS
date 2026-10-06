<?php

namespace App\Http\Resources;

use App\Models\Regla;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Regla */
class ReglaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nombre' => $this->nombre,
            'activa' => $this->activa,
            'prioridad' => $this->prioridad,
            'zona_id' => $this->zona_id,
            'condicion' => $this->condicion,
            'accion' => $this->accion,
            'actualizada' => $this->updated_at?->toIso8601String(),
        ];
    }
}

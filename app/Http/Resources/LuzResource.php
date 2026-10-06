<?php

namespace App\Http\Resources;

use App\Models\Luz;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Luz */
class LuzResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'zona_id' => $this->zona_id,
            'nombre' => $this->nombre,
            'estado_deseado' => $this->estado_deseado->value,
            'estado_real' => $this->estado_real->value,
            'actuador' => ActuadorResource::make($this->whenLoaded('actuador')),
            'actualizada' => $this->updated_at?->toIso8601String(),
        ];
    }
}

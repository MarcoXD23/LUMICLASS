<?php

namespace App\Http\Resources;

use App\Enums\Ocupacion;
use App\Models\Zona;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Zona */
class ZonaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'salon_id' => $this->salon_id,
            'nombre' => $this->nombre,
            'modo' => $this->modo->value,
            'ocupacion' => $this->when(
                $this->relationLoaded('sensores'),
                fn () => Ocupacion::desdeSensores($this->sensores)->value,
            ),
            'luces' => LuzResource::collection($this->whenLoaded('luces')),
            'sensores' => SensorResource::collection($this->whenLoaded('sensores')),
        ];
    }
}

<?php

namespace App\Http\Resources;

use App\Models\Salon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Salon */
class SalonResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nombre' => $this->nombre,
            'zonas' => $this->whenCounted('zonas'),
            'luces' => $this->whenCounted('luces'),
            'creado' => $this->created_at?->toIso8601String(),
        ];
    }
}

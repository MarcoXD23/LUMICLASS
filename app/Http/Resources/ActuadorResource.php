<?php

namespace App\Http\Resources;

use App\Models\Actuador;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Actuador */
class ActuadorResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nombre' => $this->nombre,
            'conexion' => $this->conexion->value,
            'ocupado' => $this->ocupado,
            'ultimo_resultado' => $this->ultimo_resultado,
        ];
    }
}

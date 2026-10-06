<?php

namespace App\Http\Resources;

use App\Models\Sensor;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Sensor */
class SensorResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'zona_id' => $this->zona_id,
            'nombre' => $this->nombre,
            'tipo' => $this->tipo,
            'conexion' => $this->conexion->value,
            'presencia' => $this->presencia,
            'conteo_personas' => $this->conteo_personas,
            'ultima_lectura' => $this->ultima_lectura?->toIso8601String(),
        ];
    }
}

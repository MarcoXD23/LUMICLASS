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
            // "esp32" si la mueve un ESP32 propio; si no, el driver del .env ("simulado" o "real").
            'tipo' => $this->tieneEsp32() ? 'esp32' : config('lumiclass.driver'),
            // "local" (el servidor llama a su IP), "internet" (el ESP32 llama al servidor) o null.
            'conexion_esp32' => $this->conexionEsp32(),
            'direccion' => $this->direccion,
            'ultima_respuesta' => $this->ultima_respuesta_en?->toIso8601String(),
            'conexion' => $this->conexion->value,
            'ocupado' => $this->ocupado,
            'ultimo_resultado' => $this->ultimo_resultado,
        ];
    }
}

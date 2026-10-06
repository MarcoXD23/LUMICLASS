<?php

namespace App\Http\Requests\Simulador;

use App\Enums\EstadoConexion;
use App\Enums\RespuestaSimulada;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** {"respuesta"?: "ok"|"falla"|"lento"|"sin_respuesta", "conexion"?: "activo"|"inactivo"|"falla"} (al menos uno). */
class ActuadorRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'respuesta' => ['required_without:conexion', Rule::enum(RespuestaSimulada::class)],
            'conexion' => ['required_without:respuesta', Rule::enum(EstadoConexion::class)],
        ];
    }

    public function respuesta(): ?RespuestaSimulada
    {
        return RespuestaSimulada::tryFrom((string) $this->validated('respuesta'));
    }

    public function conexion(): ?EstadoConexion
    {
        return EstadoConexion::tryFrom((string) $this->validated('conexion'));
    }
}

<?php

namespace App\Http\Requests\Simulador;

use App\Enums\EstadoConexion;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ConexionSensorRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'conexion' => ['required', Rule::enum(EstadoConexion::class)],
        ];
    }

    public function conexion(): EstadoConexion
    {
        return EstadoConexion::from($this->validated('conexion'));
    }
}

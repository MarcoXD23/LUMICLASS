<?php

namespace App\Http\Requests\Simulador;

use App\Enums\EstadoLuz;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class InterruptorRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'estado' => ['required', Rule::in([EstadoLuz::Encendida->value, EstadoLuz::Apagada->value])],
        ];
    }

    public function estado(): EstadoLuz
    {
        return EstadoLuz::from($this->validated('estado'));
    }
}

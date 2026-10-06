<?php

namespace App\Http\Requests;

use App\Enums\AccionLuz;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Sirve para una luz y para una zona: {"accion": "encender"|"apagar", "id_solicitud": "<uuid>"}. */
class ComandoLuzRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'accion' => ['required', Rule::enum(AccionLuz::class)],
            'id_solicitud' => ['required', 'uuid'],
        ];
    }

    public function accion(): AccionLuz
    {
        return AccionLuz::from($this->validated('accion'));
    }

    public function idSolicitud(): string
    {
        return strtolower($this->validated('id_solicitud'));
    }
}

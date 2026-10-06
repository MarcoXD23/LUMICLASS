<?php

namespace App\Http\Requests\Simulador;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** {"presencia": true|false, "zona_id"?: int, "conteo_personas"?: int}. Sin zona_id aplica a todo el salón. */
class PresenciaRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'presencia' => ['required', 'boolean'],
            'zona_id' => ['nullable', 'integer', Rule::exists('zonas', 'id')->where('salon_id', $this->route('salon')->id)],
            'conteo_personas' => ['nullable', 'integer', 'between:0,500'],
        ];
    }
}

<?php

namespace App\Http\Requests\Placa;

use App\Drivers\DriverReal;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** POST /placa/confirmar {"codigo": "…", "resultado": "ok"|"falla", "mensaje"?: "…"} */
class ConfirmarRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'codigo' => ['required', 'string', 'max:16'],
            'resultado' => ['required', Rule::in([DriverReal::RESULTADO_OK, DriverReal::RESULTADO_FALLA])],
            'mensaje' => ['sometimes', 'nullable', 'string', 'max:200'],
        ];
    }
}

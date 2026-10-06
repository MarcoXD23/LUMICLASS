<?php

namespace App\Http\Requests;

use App\Models\Salon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * POST: {"nombre", "zonas"?: 1..10, "luces_por_zona"?: 1..10}. PATCH: {"nombre"}.
 * El nombre no se repite entre los salones de la misma cuenta.
 */
class GuardarSalonRequest extends FormRequest
{
    public function rules(): array
    {
        /** @var Salon|null $salon */
        $salon = $this->route('salon');

        $reglas = [
            'nombre' => [
                'required', 'string', 'max:100',
                Rule::unique('salones', 'nombre')->where('user_id', $this->user()->id)->ignore($salon?->id),
            ],
        ];

        if ($this->isMethod('post')) {
            $reglas['zonas'] = ['sometimes', 'integer', 'between:1,10'];
            $reglas['luces_por_zona'] = ['sometimes', 'integer', 'between:1,10'];
        }

        return $reglas;
    }
}

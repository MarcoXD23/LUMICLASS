<?php

namespace App\Http\Requests;

use App\Models\Zona;
use App\Servicios\ConfiguracionSalon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** POST /salones/{salon}/zonas {"nombre", "luces"?: 0..10, "sensores"?: 0..3} · PATCH /zonas/{zona} {"nombre"} */
class GuardarZonaRequest extends FormRequest
{
    public function rules(): array
    {
        /** @var Zona|null $zona */
        $zona = $this->route('zona');
        $salonId = $this->route('salon')?->id ?? $zona?->salon_id;

        $reglas = [
            'nombre' => [
                'required', 'string', 'max:100',
                Rule::unique('zonas', 'nombre')->where('salon_id', $salonId)->ignore($zona?->id),
            ],
        ];

        if ($this->isMethod('post')) {
            $reglas['luces'] = ['sometimes', 'integer', 'between:0,'.ConfiguracionSalon::MAXIMO_LUCES_POR_ZONA];
            $reglas['sensores'] = ['sometimes', 'integer', 'between:0,'.ConfiguracionSalon::MAXIMO_SENSORES_POR_ZONA];
        }

        return $reglas;
    }
}

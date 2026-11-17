<?php

namespace App\Http\Requests;

use App\Models\NumeroEnPlaca;
use App\Models\Sensor;
use App\Models\Zona;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** POST /zonas/{zona}/sensores {"nombre"} · PATCH /sensores/{sensor} {"nombre"?, "numero_en_placa"?} */
class GuardarSensorRequest extends FormRequest
{
    public function rules(): array
    {
        /** @var Sensor|null $sensor */
        $sensor = $this->route('sensor');
        /** @var Zona|null $zona */
        $zona = $this->route('zona') ?? $sensor?->zona;

        return [
            'nombre' => [
                $sensor ? 'required_without:numero_en_placa' : 'required', 'string', 'max:100',
                Rule::unique('sensores', 'nombre')
                    ->whereIn('zona_id', Zona::query()->where('salon_id', $zona?->salon_id)->pluck('id'))
                    ->ignore($sensor?->id),
            ],
            // Número del PIR en la placa (1 = primer pin de PIR). Si otro sensor lo usa, se intercambian.
            'numero_en_placa' => $sensor ? ['sometimes', 'integer', 'between:1,'.NumeroEnPlaca::MAXIMO] : ['prohibited'],
        ];
    }
}

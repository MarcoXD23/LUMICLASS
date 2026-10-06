<?php

namespace App\Http\Requests;

use App\Models\Sensor;
use App\Models\Zona;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** POST /zonas/{zona}/sensores {"nombre"} · PATCH /sensores/{sensor} {"nombre"} */
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
                'required', 'string', 'max:100',
                Rule::unique('sensores', 'nombre')
                    ->whereIn('zona_id', Zona::query()->where('salon_id', $zona?->salon_id)->pluck('id'))
                    ->ignore($sensor?->id),
            ],
        ];
    }
}

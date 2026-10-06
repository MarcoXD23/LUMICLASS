<?php

namespace App\Http\Requests;

use App\Models\Luz;
use App\Models\Zona;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** POST /zonas/{zona}/luces {"nombre"} · PATCH /luces/{luz} {"nombre"?, "zona_id"?} */
class GuardarLuzRequest extends FormRequest
{
    public function rules(): array
    {
        /** @var Luz|null $luz */
        $luz = $this->route('luz');
        /** @var Zona|null $zona */
        $zona = $this->route('zona') ?? $luz?->zona;
        $zonasDelSalon = Zona::query()->where('salon_id', $zona?->salon_id)->pluck('id');
        $nuevo = $this->isMethod('post');

        return [
            'nombre' => [
                $nuevo ? 'required' : 'sometimes', 'string', 'max:100',
                Rule::unique('luces', 'nombre')->whereIn('zona_id', $zonasDelSalon)->ignore($luz?->id),
            ],
            // Solo se puede mover a una zona del MISMO salón.
            'zona_id' => $nuevo ? ['prohibited'] : ['sometimes', 'integer', Rule::in($zonasDelSalon->all())],
        ];
    }
}

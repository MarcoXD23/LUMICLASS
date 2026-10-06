<?php

namespace App\Http\Requests;

use App\Enums\AccionLuz;
use App\Enums\Ocupacion;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Crear (POST) o reemplazar (PUT) una regla: se exigen todos los campos. */
class GuardarReglaRequest extends FormRequest
{
    public function rules(): array
    {
        // Al crear, el salón viene en la ruta; al editar, es el de la regla.
        $salonId = $this->route('salon')?->id ?? $this->route('regla')?->salon_id;

        return [
            'nombre' => ['required', 'string', 'max:100'],
            'activa' => ['required', 'boolean'],
            'prioridad' => ['required', 'integer', 'between:1,1000'],
            'zona_id' => ['nullable', 'integer', Rule::exists('zonas', 'id')->where('salon_id', $salonId)],
            // array:... rechaza claves desconocidas para no guardar condiciones que nadie evalúa.
            'condicion' => ['required', 'array:presencia,duracion_segundos'],
            'condicion.presencia' => ['required', Rule::in([Ocupacion::Ocupado->value, Ocupacion::Vacio->value])],
            'condicion.duracion_segundos' => ['sometimes', 'integer', 'between:0,86400'],
            'accion' => ['required', 'array:accion'],
            'accion.accion' => ['required', Rule::enum(AccionLuz::class)],
        ];
    }
}

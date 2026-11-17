<?php

namespace App\Http\Requests;

use App\Drivers\ClienteEsp32;
use App\Models\Actuador;
use Closure;
use Illuminate\Foundation\Http\FormRequest;

/** PATCH /actuadores/{actuador}/esp32 {"direccion": "192.168.18.187" | null}. Vacío = quitar el ESP32 de la luz. */
class GuardarEsp32Request extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $texto = trim((string) $this->input('direccion'));

        $this->merge([
            'direccion_escrita' => $texto,
            'direccion' => $texto === '' ? null : (ClienteEsp32::normalizar($texto) ?? $texto),
        ]);
    }

    public function rules(): array
    {
        /** @var Actuador $actuador */
        $actuador = $this->route('actuador');

        return [
            'direccion' => [
                'present', 'nullable', 'string', 'max:120',
                function (string $campo, mixed $valor, Closure $falla) use ($actuador) {
                    if ($valor === null) {
                        return;
                    }
                    if (ClienteEsp32::normalizar($valor) !== $valor) {
                        $falla('La dirección no es válida. Escribe la IP que muestra el Serial Monitor del ESP32, por ejemplo 192.168.18.187.');

                        return;
                    }
                    $otra = Actuador::query()
                        ->where('salon_id', $actuador->salon_id)
                        ->where('direccion', $valor)
                        ->whereKeyNot($actuador->id)
                        ->with('luz')
                        ->first();
                    if ($otra !== null) {
                        $falla('Esa dirección ya la usa la luz "'.($otra->luz?->nombre ?? $otra->nombre).'".');
                    }
                },
            ],
        ];
    }

    public function attributes(): array
    {
        return ['direccion' => 'dirección del ESP32'];
    }
}

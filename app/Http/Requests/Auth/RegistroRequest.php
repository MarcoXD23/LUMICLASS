<?php

namespace App\Http\Requests\Auth;

use App\Servicios\CorreoAlternativo;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RegistroRequest extends FormRequest
{
    /** Los correos se guardan en minúsculas: "Ana@x.com" y "ana@x.com" son la misma cuenta. */
    protected function prepareForValidation(): void
    {
        foreach (['email', 'correo_alternativo'] as $campo) {
            if (is_string($this->input($campo))) {
                $valor = strtolower(trim($this->input($campo)));
                $this->merge([$campo => $valor === '' ? null : $valor]);
            }
        }
    }

    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'max:100'],
            // Tampoco puede ser el correo alternativo de otra cuenta.
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email', Rule::unique('users', 'correo_alternativo')],
            'password' => ['required', 'string', 'min:8', 'max:100', 'confirmed'],
            // Opcional (recomendado). Se verifica con un código antes de quedar activo.
            'correo_alternativo' => [
                'nullable', 'string', 'email', 'max:255',
                function (string $campo, mixed $valor, Closure $fallar) {
                    if ($valor === $this->input('email')) {
                        $fallar('El correo alternativo debe ser distinto de tu correo principal.');
                    } elseif (CorreoAlternativo::enUsoPorOtraCuenta($valor)) {
                        $fallar('Ese correo ya está en uso en otra cuenta.');
                    }
                },
            ],
        ];
    }
}

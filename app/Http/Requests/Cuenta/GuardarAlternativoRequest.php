<?php

namespace App\Http\Requests\Cuenta;

use App\Servicios\CorreoAlternativo;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Hash;

/** {"correo_alternativo", "password_actual"}: agregar o cambiar el correo alternativo (luego se verifica). */
class GuardarAlternativoRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('correo_alternativo'))) {
            $this->merge(['correo_alternativo' => strtolower(trim($this->input('correo_alternativo')))]);
        }
    }

    public function rules(): array
    {
        $usuario = $this->user();

        return [
            'correo_alternativo' => [
                'required', 'string', 'email', 'max:255',
                function (string $campo, mixed $valor, Closure $fallar) use ($usuario) {
                    if ($valor === $usuario->email) {
                        $fallar('El correo alternativo debe ser distinto de tu correo principal.');
                    } elseif (CorreoAlternativo::enUsoPorOtraCuenta($valor, $usuario->id)) {
                        $fallar('Ese correo ya está en uso en otra cuenta.');
                    }
                },
            ],
            'password_actual' => ['required', 'string', $this->contrasenaActual()],
        ];
    }

    /** Pedir la contraseña actual: así, si alguien deja la sesión abierta, otro no puede cambiar la forma de recuperar. */
    protected function contrasenaActual(): Closure
    {
        return function (string $campo, mixed $valor, Closure $fallar) {
            if (! is_string($valor) || ! Hash::check($valor, $this->user()->password)) {
                $fallar('La contraseña actual no es correcta.');
            }
        };
    }
}

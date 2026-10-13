<?php

namespace App\Http\Requests\Cuenta;

/** {"password_actual"}: quitar el correo alternativo pide la contraseña actual. */
class QuitarAlternativoRequest extends GuardarAlternativoRequest
{
    public function rules(): array
    {
        return [
            'password_actual' => ['required', 'string', $this->contrasenaActual()],
        ];
    }
}

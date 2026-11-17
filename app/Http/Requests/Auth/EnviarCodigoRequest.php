<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

/** {"email", "via": "correo"|"alternativo"}: pedir un código de 6 dígitos para recuperar la contraseña. */
class EnviarCodigoRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('email'))) {
            $this->merge(['email' => strtolower(trim($this->input('email')))]);
        }
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email', 'max:255'],
            'via' => ['required', 'in:correo,alternativo'],
        ];
    }
}

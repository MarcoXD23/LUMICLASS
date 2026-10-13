<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

/** {"email", "via", "codigo": "123456", "password", "password_confirmation"} */
class RestablecerConCodigoRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge(array_filter([
            'email' => is_string($this->input('email')) ? strtolower(trim($this->input('email'))) : null,
            // Acepta "123 456" o "123-456" pegado desde el correo.
            'codigo' => is_string($this->input('codigo')) ? preg_replace('/\D/', '', $this->input('codigo')) : null,
        ], fn ($valor) => $valor !== null));
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email', 'max:255'],
            'via' => ['required', 'in:correo,alternativo'],
            'codigo' => ['required', 'digits:6'],
            'password' => ['required', 'string', 'min:8', 'max:100', 'confirmed'],
        ];
    }
}

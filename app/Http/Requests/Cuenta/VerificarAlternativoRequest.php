<?php

namespace App\Http\Requests\Cuenta;

use Illuminate\Foundation\Http\FormRequest;

/** {"codigo": "123456"}: confirmar el correo alternativo con el código que le llegó. */
class VerificarAlternativoRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('codigo'))) {
            $this->merge(['codigo' => preg_replace('/\D/', '', $this->input('codigo'))]);
        }
    }

    public function rules(): array
    {
        return [
            'codigo' => ['required', 'digits:6'],
        ];
    }
}

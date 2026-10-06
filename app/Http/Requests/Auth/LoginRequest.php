<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

/** Sirve para iniciar sesión (navegador) y para pedir un token (scripts y placa). */
class LoginRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
            'nombre_dispositivo' => ['sometimes', 'string', 'max:100'],
        ];
    }

    /** @return array{email: string, password: string} */
    public function credenciales(): array
    {
        return ['email' => $this->validated('email'), 'password' => $this->validated('password')];
    }
}

<?php

namespace App\Http\Requests;

use App\Enums\ModoZona;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CambiarModoRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'modo' => ['required', Rule::enum(ModoZona::class)],
        ];
    }

    public function modo(): ModoZona
    {
        return ModoZona::from($this->validated('modo'));
    }
}

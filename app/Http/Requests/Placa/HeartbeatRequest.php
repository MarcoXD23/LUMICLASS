<?php

namespace App\Http\Requests\Placa;

use Illuminate\Foundation\Http\FormRequest;

/** POST /placa/heartbeat {"version"?: "1.0.0"} */
class HeartbeatRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'version' => ['sometimes', 'nullable', 'string', 'max:20'],
        ];
    }
}

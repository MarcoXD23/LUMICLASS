<?php

namespace App\Http\Requests\Placa;

use App\Models\NumeroEnPlaca;
use Illuminate\Foundation\Http\FormRequest;

/** POST /placa/lecturas {"lecturas": [{"sensor": 1, "presencia": true}, …]} */
class LecturasRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'lecturas' => ['required', 'array', 'min:1', 'max:'.NumeroEnPlaca::MAXIMO],
            'lecturas.*.sensor' => ['required', 'integer', 'distinct', 'between:1,'.NumeroEnPlaca::MAXIMO],
            'lecturas.*.presencia' => ['required', 'boolean'],
        ];
    }

    /** @return list<array{sensor: int, presencia: bool}> */
    public function lecturas(): array
    {
        return array_map(
            fn (array $l) => ['sensor' => (int) $l['sensor'], 'presencia' => filter_var($l['presencia'], FILTER_VALIDATE_BOOLEAN)],
            array_values($this->validated('lecturas')),
        );
    }
}

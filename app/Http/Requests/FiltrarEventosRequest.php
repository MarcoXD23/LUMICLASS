<?php

namespace App\Http\Requests;

use App\Enums\OrigenEvento;
use App\Enums\SeveridadEvento;
use App\Enums\TipoEvento;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class FiltrarEventosRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'tipo' => ['sometimes', Rule::enum(TipoEvento::class)],
            'origen' => ['sometimes', Rule::enum(OrigenEvento::class)],
            'severidad' => ['sometimes', Rule::enum(SeveridadEvento::class)],
            'desde' => ['sometimes', 'date_format:Y-m-d'],
            'hasta' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:desde'],
            'por_pagina' => ['sometimes', 'integer', 'between:1,100'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ];
    }
}

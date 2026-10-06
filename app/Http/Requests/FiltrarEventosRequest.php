<?php

namespace App\Http\Requests;

use App\Enums\OrigenEvento;
use App\Enums\SeveridadEvento;
use App\Enums\TipoEvento;
use Carbon\CarbonImmutable;
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
            // La del navegador: "desde" y "hasta" son días locales, no días UTC.
            'zona_horaria' => ['sometimes', 'timezone:all'],
        ];
    }

    /** Inicio del día "desde" en hora local, convertido a UTC (como se guardan los eventos). */
    public function desdeUtc(): ?CarbonImmutable
    {
        $desde = $this->validated('desde');

        return $desde ? CarbonImmutable::parse($desde, $this->zonaHoraria())->startOfDay()->utc() : null;
    }

    /** Fin del día "hasta" en hora local, convertido a UTC. */
    public function hastaUtc(): ?CarbonImmutable
    {
        $hasta = $this->validated('hasta');

        return $hasta ? CarbonImmutable::parse($hasta, $this->zonaHoraria())->endOfDay()->utc() : null;
    }

    private function zonaHoraria(): string
    {
        return $this->validated('zona_horaria', config('app.timezone'));
    }
}

<?php

namespace App\Http\Requests;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;

/** ?rango=hoy|7d|30d&zona_horaria=America/Bogota (la del navegador; los días se cortan a medianoche local). */
class EstadisticasRequest extends FormRequest
{
    private const DIAS = ['hoy' => 1, '7d' => 7, '30d' => 30];

    public function rules(): array
    {
        return [
            'rango' => ['sometimes', 'in:'.implode(',', array_keys(self::DIAS))],
            'zona_horaria' => ['sometimes', 'timezone:all'],
        ];
    }

    public function rango(): string
    {
        return $this->validated('rango', 'hoy');
    }

    public function zonaHoraria(): string
    {
        return $this->validated('zona_horaria', config('app.timezone'));
    }

    /** @return array{0: CarbonImmutable, 1: CarbonImmutable} desde la medianoche local del primer día hasta ahora */
    public function periodo(): array
    {
        $ahora = CarbonImmutable::now($this->zonaHoraria());
        $desde = $ahora->startOfDay()->subDays(self::DIAS[$this->rango()] - 1);

        return [$desde->utc(), $ahora->utc()];
    }
}

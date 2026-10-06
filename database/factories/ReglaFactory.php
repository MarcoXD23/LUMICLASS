<?php

namespace Database\Factories;

use App\Models\Regla;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Regla> */
class ReglaFactory extends Factory
{
    public function definition(): array
    {
        return [
            'zona_id' => null,
            'nombre' => 'Regla '.fake()->unique()->numberBetween(1, 999),
            'activa' => true,
            'prioridad' => 100,
            'condicion' => ['presencia' => 'ocupado'],
            'accion' => ['accion' => 'encender'],
        ];
    }
}

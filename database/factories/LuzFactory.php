<?php

namespace Database\Factories;

use App\Enums\EstadoLuz;
use App\Models\Actuador;
use App\Models\Luz;
use App\Models\Zona;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Luz> */
class LuzFactory extends Factory
{
    public function definition(): array
    {
        return [
            'zona_id' => Zona::factory(),
            'actuador_id' => Actuador::factory(),
            'nombre' => 'Luz '.fake()->unique()->numberBetween(1, 999),
            'estado_deseado' => EstadoLuz::Apagada,
            'estado_real' => EstadoLuz::Desconocida,
        ];
    }

    public function sinActuador(): static
    {
        return $this->state(['actuador_id' => null]);
    }
}

<?php

namespace Database\Factories;

use App\Enums\EstadoConexion;
use App\Models\Actuador;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Actuador> */
class ActuadorFactory extends Factory
{
    public function definition(): array
    {
        return [
            'nombre' => 'Servo '.fake()->unique()->numberBetween(1, 999),
            'conexion' => EstadoConexion::Activo,
            'ocupado' => false,
        ];
    }

    public function enFalla(): static
    {
        return $this->state(['conexion' => EstadoConexion::Falla]);
    }

    public function ocupado(): static
    {
        return $this->state(['ocupado' => true]);
    }
}

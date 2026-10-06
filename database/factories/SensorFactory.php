<?php

namespace Database\Factories;

use App\Enums\EstadoConexion;
use App\Models\Sensor;
use App\Models\Zona;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Sensor> */
class SensorFactory extends Factory
{
    public function definition(): array
    {
        return [
            'zona_id' => Zona::factory(),
            'nombre' => 'Sensor '.fake()->unique()->numberBetween(1, 999),
            'tipo' => 'pir',
            'conexion' => EstadoConexion::Activo,
            'presencia' => null,
        ];
    }

    public function conPresencia(bool $presencia = true): static
    {
        return $this->state(['presencia' => $presencia, 'ultima_lectura' => now()]);
    }

    public function enFalla(): static
    {
        return $this->state(['conexion' => EstadoConexion::Falla]);
    }
}

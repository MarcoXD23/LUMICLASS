<?php

namespace Database\Factories;

use App\Enums\ModoZona;
use App\Models\Salon;
use App\Models\Zona;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Zona> */
class ZonaFactory extends Factory
{
    public function definition(): array
    {
        return [
            'salon_id' => Salon::factory(),
            'nombre' => 'Zona '.fake()->unique()->word(),
            'modo' => ModoZona::Automatico,
        ];
    }

    public function manual(): static
    {
        return $this->state(['modo' => ModoZona::Manual]);
    }
}

<?php

namespace Database\Factories;

use App\Models\Salon;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Salon> */
class SalonFactory extends Factory
{
    public function definition(): array
    {
        return ['nombre' => 'Salón '.fake()->unique()->numberBetween(100, 999)];
    }
}

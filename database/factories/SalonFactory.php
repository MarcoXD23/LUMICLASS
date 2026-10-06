<?php

namespace Database\Factories;

use App\Models\Salon;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Salon> */
class SalonFactory extends Factory
{
    public function definition(): array
    {
        return [
            // En las pruebas, por defecto el salón es del usuario con sesión iniciada.
            'user_id' => fn () => auth()->id() ?? User::factory(),
            'nombre' => 'Salón '.fake()->unique()->numberBetween(100, 999),
        ];
    }
}

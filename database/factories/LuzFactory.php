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
            // El servo se crea en el mismo salón que la zona de la luz.
            'actuador_id' => fn (array $atributos) => Actuador::factory()->create([
                'salon_id' => Zona::query()->find($atributos['zona_id'])?->salon_id,
            ])->id,
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

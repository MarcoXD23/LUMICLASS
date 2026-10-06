<?php

namespace Database\Seeders;

use App\Models\Actuador;
use App\Models\Regla;
use App\Models\Salon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Salón de ejemplo. Cantidades PROPUESTA: cambiar aquí cuando se confirmen
 * las luces, zonas y sensores reales (preguntas de la Fase 1).
 */
class SalonDemoSeeder extends Seeder
{
    private const ZONAS = [
        ['nombre' => 'Zona frontal (pizarra)', 'luces' => ['Luz frontal izquierda', 'Luz frontal derecha']],
        ['nombre' => 'Zona posterior', 'luces' => ['Luz posterior izquierda', 'Luz posterior derecha']],
    ];

    public function run(): void
    {
        // Se puede ejecutar varias veces sin duplicar el salón.
        if (Salon::query()->exists()) {
            $this->command?->info('Ya existe un salón; no se crean datos de ejemplo.');

            return;
        }

        DB::transaction(function () {
            $salon = Salon::create(['nombre' => 'Salón 101']);
            $servo = 1;

            foreach (self::ZONAS as $indice => $datosZona) {
                $zona = $salon->zonas()->create(['nombre' => $datosZona['nombre'], 'modo' => 'automatico']);

                foreach ($datosZona['luces'] as $nombreLuz) {
                    $actuador = Actuador::create(['nombre' => 'Servo '.$servo++]);
                    $zona->luces()->create(['nombre' => $nombreLuz, 'actuador_id' => $actuador->id]);
                }

                $zona->sensores()->create(['nombre' => 'Sensor PIR '.($indice + 1), 'tipo' => 'pir']);
            }

            Regla::create([
                'nombre' => 'Encender al detectar presencia',
                'prioridad' => 10,
                'condicion' => ['presencia' => 'ocupado'],
                'accion' => ['accion' => 'encender'],
            ]);

            // La espera evita apagar por lecturas falsas del PIR.
            Regla::create([
                'nombre' => 'Apagar tras 5 minutos sin presencia',
                'prioridad' => 20,
                'condicion' => ['presencia' => 'vacio', 'duracion_segundos' => 300],
                'accion' => ['accion' => 'apagar'],
            ]);
        });
    }
}

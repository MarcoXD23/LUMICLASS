<?php

namespace App\Servicios;

use App\Enums\EstadoLuz;
use App\Models\Salon;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/** Crea un salón completo: zonas, luces con su servo, un sensor PIR por zona y las reglas iniciales. */
class CreadorSalon
{
    /** Salón de ejemplo que recibe cada cuenta nueva (cantidades PROPUESTA). */
    private const EJEMPLO = [
        'Zona frontal (pizarra)' => ['Luz frontal izquierda', 'Luz frontal derecha'],
        'Zona posterior' => ['Luz posterior izquierda', 'Luz posterior derecha'],
    ];

    public function crearEjemplo(User $usuario, string $nombre = 'Salón 101'): Salon
    {
        return $this->crearConEstructura($usuario, $nombre, self::EJEMPLO);
    }

    public function crear(User $usuario, string $nombre, int $zonas, int $lucesPorZona): Salon
    {
        $estructura = [];

        for ($z = 1; $z <= $zonas; $z++) {
            for ($l = 1; $l <= $lucesPorZona; $l++) {
                $estructura["Zona {$z}"][] = "Luz {$z}.{$l}";
            }
        }

        return $this->crearConEstructura($usuario, $nombre, $estructura);
    }

    /** @param  array<string, list<string>>  $estructura  nombre de zona => nombres de sus luces */
    private function crearConEstructura(User $usuario, string $nombre, array $estructura): Salon
    {
        return DB::transaction(function () use ($usuario, $nombre, $estructura) {
            $salon = $usuario->salones()->create(['nombre' => $nombre]);
            // En la simulación se sabe que las luces empiezan apagadas; con hardware real no.
            $estadoReal = config('lumiclass.driver') === 'simulado' ? EstadoLuz::Apagada : EstadoLuz::Desconocida;
            $servo = 1;
            $sensor = 1;

            foreach ($estructura as $nombreZona => $luces) {
                $zona = $salon->zonas()->create(['nombre' => $nombreZona, 'modo' => 'automatico']);

                foreach ($luces as $nombreLuz) {
                    $actuador = $salon->actuadores()->create(['nombre' => 'Servo '.$servo++]);
                    $zona->luces()->create(['nombre' => $nombreLuz, 'actuador_id' => $actuador->id, 'estado_real' => $estadoReal]);
                }

                $zona->sensores()->create(['nombre' => 'Sensor PIR '.$sensor++, 'tipo' => 'pir']);
            }

            $salon->reglas()->create([
                'nombre' => 'Encender al detectar presencia',
                'prioridad' => 10,
                'condicion' => ['presencia' => 'ocupado'],
                'accion' => ['accion' => 'encender'],
            ]);

            // La espera evita apagar por lecturas falsas del PIR.
            $salon->reglas()->create([
                'nombre' => 'Apagar tras 5 minutos sin presencia',
                'prioridad' => 20,
                'condicion' => ['presencia' => 'vacio', 'duracion_segundos' => 300],
                'accion' => ['accion' => 'apagar'],
            ]);

            return $salon;
        });
    }
}

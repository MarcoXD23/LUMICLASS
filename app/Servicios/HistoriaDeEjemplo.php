<?php

namespace App\Servicios;

use App\Enums\EstadoLuz;
use App\Enums\Ocupacion;
use App\Models\CambioLuz;
use App\Models\CambioOcupacion;
use App\Models\Salon;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Inventa días de clases pasados (SOLO para la cuenta demo) para que Estadísticas no salga vacía en la presentación.
 * Dos bloques de clase por día (7:00 y 10:00 hora local); a veces alguien deja las luces encendidas
 * un rato después de irse, que es justo lo que el sistema muestra como "con la zona vacía".
 * Es determinista: con el mismo salón y los mismos días genera siempre la misma historia.
 */
class HistoriaDeEjemplo
{
    /** [hora, minuto, duración en minutos] de cada bloque de clase. */
    private const BLOQUES = [[7, 0, 110], [10, 0, 115]];

    /** @return array{cambios_luz: int, cambios_ocupacion: int} */
    public function generar(Salon $salon, int $dias, string $zonaHoraria): array
    {
        $zonas = $salon->zonas()->with(['luces' => fn ($q) => $q->orderBy('id')])->orderBy('id')->get();
        $luces = $zonas->flatMap->luces;

        return DB::transaction(function () use ($zonas, $luces, $salon, $dias, $zonaHoraria) {
            CambioLuz::query()->whereIn('luz_id', $luces->pluck('id'))->delete();
            CambioOcupacion::query()->whereIn('zona_id', $zonas->pluck('id'))->delete();

            mt_srand($salon->id);
            $hoy = CarbonImmutable::now($zonaHoraria)->startOfDay();
            $filasLuz = [];
            $filasOcupacion = [];

            // Antes de la historia todo estaba apagado.
            foreach ($luces as $luz) {
                $filasLuz[] = [$luz->id, EstadoLuz::Apagada, $hoy->subDays($dias)];
            }

            for ($d = $dias; $d >= 1; $d--) {
                $dia = $hoy->subDays($d);

                foreach (self::BLOQUES as [$hora, $minuto, $duracion]) {
                    foreach ($zonas as $i => $zona) {
                        // La zona posterior no siempre se usa.
                        if ($i > 0 && mt_rand(0, 2) === 0) {
                            continue;
                        }

                        $entra = $dia->setTime($hora, $minuto)->addMinutes(mt_rand(0, 15));
                        $sale = $entra->addMinutes($duracion + mt_rand(-15, 10));
                        $filasOcupacion[] = [$zona->id, Ocupacion::Ocupado, $entra];
                        $filasOcupacion[] = [$zona->id, Ocupacion::Vacio, $sale];

                        foreach ($zona->luces as $luz) {
                            // Normalmente la regla apaga a los 5 min; uno de cada cuatro días alguien las deja más tiempo.
                            $apaga = $sale->addMinutes(mt_rand(0, 3) === 0 ? mt_rand(15, 50) : 5);
                            $filasLuz[] = [$luz->id, EstadoLuz::Encendida, $entra->addMinute()];
                            $filasLuz[] = [$luz->id, EstadoLuz::Apagada, $apaga];
                        }
                    }
                }
            }

            foreach ($filasLuz as [$luzId, $estado, $momento]) {
                CambioLuz::create(['luz_id' => $luzId, 'estado' => $estado, 'created_at' => $momento->utc()]);
            }
            foreach ($filasOcupacion as [$zonaId, $ocupacion, $momento]) {
                CambioOcupacion::create(['zona_id' => $zonaId, 'ocupacion' => $ocupacion, 'created_at' => $momento->utc()]);
            }

            return ['cambios_luz' => count($filasLuz), 'cambios_ocupacion' => count($filasOcupacion)];
        });
    }
}

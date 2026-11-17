<?php

namespace App\Servicios;

use App\Models\Actuador;
use Illuminate\Support\Facades\Cache;
use Throwable;

/**
 * Hace avanzar lo que depende del tiempo: órdenes lentas o sin respuesta y reglas con duración.
 * Lo ejecutan el comando "lumiclass:tick" (programado) y la consulta del dashboard.
 */
class ServicioTick
{
    public function __construct(
        private readonly ServicioLuces $luces,
        private readonly MotorReglas $motor,
    ) {}

    /** @return array{omitido: bool, pendientes_revisadas: int, ordenes_reglas: int} */
    public function ejecutar(): array
    {
        // Evita que el programador y el dashboard procesen lo mismo a la vez.
        $candado = Cache::lock('lumiclass.tick', 30);

        if (! $candado->get()) {
            return ['omitido' => true, 'pendientes_revisadas' => 0, 'ordenes_reglas' => 0];
        }

        try {
            $pendientes = Actuador::query()->whereNotNull('orden_pendiente')->get();
            $pendientes->each(fn (Actuador $actuador) => $this->luces->revisarPendiente($actuador));

            return [
                'omitido' => false,
                'pendientes_revisadas' => $pendientes->count(),
                'ordenes_reglas' => $this->motor->evaluarTodas(),
            ];
        } finally {
            $candado->release();
        }
    }

    /** Versión para el dashboard: como máximo una vez por intervalo y sin romper la consulta si falla. */
    public function ejecutarSiCorresponde(): void
    {
        if (! Cache::add('lumiclass.tick.reciente', true, (int) config('lumiclass.tick.intervalo_minimo_segundos'))) {
            return;
        }

        try {
            $this->ejecutar();
        } catch (Throwable $error) {
            report($error);
        }
    }
}

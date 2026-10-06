<?php

namespace App\Drivers;

use App\Enums\RespuestaSimulada;
use App\Models\Actuador;
use App\Models\Salon;
use Illuminate\Support\Facades\Cache;

/**
 * Configuración del simulador que no forma parte del dominio (cómo responde cada servo).
 * Se guarda en el caché (tabla "cache" en desarrollo) para que dure entre peticiones.
 */
class EscenarioSimulado
{
    private const PREFIJO = 'lumiclass.sim.respuesta.';

    public function respuesta(Actuador $actuador): RespuestaSimulada
    {
        return RespuestaSimulada::tryFrom((string) Cache::get(self::PREFIJO.$actuador->id)) ?? RespuestaSimulada::Ok;
    }

    public function definirRespuesta(Actuador $actuador, RespuestaSimulada $respuesta): void
    {
        Cache::forever(self::PREFIJO.$actuador->id, $respuesta->value);
    }

    public function reiniciar(Salon $salon): void
    {
        foreach ($salon->actuadores()->pluck('id') as $id) {
            Cache::forget(self::PREFIJO.$id);
        }
    }
}

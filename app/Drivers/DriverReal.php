<?php

namespace App\Drivers;

use App\Enums\AccionLuz;
use App\Models\Actuador;

/** Se implementa en la Fase 8, solo con el hardware confirmado. */
class DriverReal implements DriverHardware
{
    private const SIN_IMPLEMENTAR = 'El driver real todavía no está implementado (Fase 8). Usa LUMICLASS_DRIVER=simulado.';

    public function nombre(): string
    {
        return 'real';
    }

    public function accionar(Actuador $actuador, AccionLuz $accion): RespuestaActuador
    {
        return RespuestaActuador::fallida(self::SIN_IMPLEMENTAR);
    }

    public function consultarPendiente(Actuador $actuador): RespuestaActuador
    {
        return RespuestaActuador::fallida(self::SIN_IMPLEMENTAR);
    }
}

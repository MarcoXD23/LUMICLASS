<?php

namespace App\Drivers;

use App\Enums\AccionLuz;
use App\Enums\RespuestaSimulada;
use App\Models\Actuador;

class DriverSimulado implements DriverHardware
{
    public function __construct(private readonly EscenarioSimulado $escenario) {}

    public function nombre(): string
    {
        return 'simulado';
    }

    public function accionar(Actuador $actuador, AccionLuz $accion): RespuestaActuador
    {
        return match ($this->escenario->respuesta($actuador)) {
            RespuestaSimulada::Ok => RespuestaActuador::completada(),
            RespuestaSimulada::Falla => RespuestaActuador::fallida('El servo no logró mover el interruptor (falla simulada).'),
            RespuestaSimulada::Lento, RespuestaSimulada::SinRespuesta => RespuestaActuador::pendiente(),
        };
    }

    public function consultarPendiente(Actuador $actuador): RespuestaActuador
    {
        $respuesta = $this->escenario->respuesta($actuador);

        // Si mientras tanto se cambió la respuesta a "ok" o "falla", se aplica de inmediato.
        if ($respuesta === RespuestaSimulada::Ok) {
            return RespuestaActuador::completada();
        }

        if ($respuesta === RespuestaSimulada::Falla) {
            return RespuestaActuador::fallida('El servo no logró mover el interruptor (falla simulada).');
        }

        $segundos = $actuador->orden_iniciada_en?->diffInSeconds(now()) ?? 0;

        if ($respuesta === RespuestaSimulada::Lento && $segundos >= config('lumiclass.servo.segundos_lento')) {
            return RespuestaActuador::completada('El servo confirmó la orden (respuesta lenta simulada).');
        }

        return RespuestaActuador::pendiente();
    }
}

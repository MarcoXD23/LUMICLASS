<?php

namespace App\Drivers;

use App\Enums\AccionLuz;
use App\Models\Actuador;

/**
 * Lo que el sistema necesita del hardware de los servos. Se elige con LUMICLASS_DRIVER.
 * Las lecturas de los sensores no pasan por aquí: llegan a ServicioSensores
 * (desde el simulador o, en la Fase 8, desde la placa).
 */
interface DriverHardware
{
    public function nombre(): string;

    /** Envía la orden al servo. Puede confirmar al instante, quedar pendiente o fallar. */
    public function accionar(Actuador $actuador, AccionLuz $accion): RespuestaActuador;

    /** Revisa una orden que quedó pendiente. El tiempo de espera máximo lo controla ServicioTick. */
    public function consultarPendiente(Actuador $actuador): RespuestaActuador;
}

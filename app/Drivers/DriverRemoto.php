<?php

namespace App\Drivers;

use App\Enums\AccionLuz;
use App\Models\Actuador;

/**
 * ESP32 "por internet": el servidor no puede llamarlo (está detrás del router), así que la orden
 * queda pendiente y el ESP32 la recoge en su siguiente latido (POST /dispositivo/latido).
 * Se confirma cuando el ESP32 informa que el relé quedó como se pidió.
 */
class DriverRemoto implements DriverHardware
{
    public function nombre(): string
    {
        return 'remoto';
    }

    public function accionar(Actuador $actuador, AccionLuz $accion): RespuestaActuador
    {
        return RespuestaActuador::pendiente('Orden enviada; el ESP32 la recoge en su próxima conexión (unos 2 s).');
    }

    public function consultarPendiente(Actuador $actuador): RespuestaActuador
    {
        $esperado = $actuador->orden_pendiente === AccionLuz::Encender;
        $informoDespues = $actuador->ultima_respuesta_en !== null
            && $actuador->orden_iniciada_en !== null
            && $actuador->ultima_respuesta_en->greaterThanOrEqualTo($actuador->orden_iniciada_en);

        return $informoDespues && $actuador->estado_reportado === $esperado
            ? RespuestaActuador::completada('El ESP32 confirmó la orden.')
            : RespuestaActuador::pendiente();
    }
}

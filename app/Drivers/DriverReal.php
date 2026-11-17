<?php

namespace App\Drivers;

use App\Enums\AccionLuz;
use App\Models\Actuador;

/**
 * Mueve la luz con el ESP32 del actuador (su "direccion") o, si no tiene, con LUMICLASS_ESP32_URL.
 * El ESP32 responde al instante con el estado del relé: esa respuesta es la confirmación.
 */
class DriverReal implements DriverHardware
{
    public function __construct(private readonly ClienteEsp32 $esp32) {}

    public function nombre(): string
    {
        return 'real';
    }

    public function accionar(Actuador $actuador, AccionLuz $accion): RespuestaActuador
    {
        $direccion = $this->direccion($actuador);

        if ($direccion === null) {
            return RespuestaActuador::fallida('La luz no tiene la dirección de su ESP32. Escríbela en Configurar salón.');
        }

        $encender = $accion === AccionLuz::Encender;
        $confirmado = $this->esp32->ordenar($direccion, $encender);

        if ($confirmado === null) {
            return RespuestaActuador::fallida("El ESP32 ({$direccion}) no responde. Revisa que esté encendido y en la misma red WiFi.");
        }

        $actuador->forceFill(['ultima_respuesta_en' => now()]);

        return $confirmado === $encender
            ? RespuestaActuador::completada('El ESP32 confirmó la orden.')
            : RespuestaActuador::fallida('El ESP32 respondió, pero el relé no cambió de estado.');
    }

    public function consultarPendiente(Actuador $actuador): RespuestaActuador
    {
        $direccion = $this->direccion($actuador);
        $esperado = $actuador->orden_pendiente === AccionLuz::Encender;
        $estado = $direccion === null ? null : $this->esp32->estado($direccion);

        return match (true) {
            $estado === null => RespuestaActuador::pendiente(),
            $estado === $esperado => RespuestaActuador::completada('El ESP32 confirmó la orden.'),
            default => RespuestaActuador::fallida('El ESP32 respondió, pero el relé no cambió de estado.'),
        };
    }

    private function direccion(Actuador $actuador): ?string
    {
        $direccion = $actuador->direccion ?: config('lumiclass.esp32.url');

        return $direccion !== '' ? $direccion : null;
    }
}

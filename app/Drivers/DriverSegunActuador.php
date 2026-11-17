<?php

namespace App\Drivers;

use App\Enums\AccionLuz;
use App\Models\Actuador;

/**
 * Elige el driver de cada orden según la luz:
 * - ESP32 por internet (tiene clave) → DriverRemoto: la placa recoge la orden en su latido.
 * - ESP32 local (tiene IP) → DriverReal: el servidor llama a la placa.
 * - Sin ESP32 → el driver del .env (LUMICLASS_DRIVER), normalmente el simulador.
 */
class DriverSegunActuador implements DriverHardware
{
    public function __construct(
        private readonly DriverHardware $base,
        private readonly DriverReal $real,
        private readonly DriverRemoto $remoto,
    ) {}

    public function nombre(): string
    {
        return $this->base->nombre();
    }

    public function accionar(Actuador $actuador, AccionLuz $accion): RespuestaActuador
    {
        return $this->para($actuador)->accionar($actuador, $accion);
    }

    public function consultarPendiente(Actuador $actuador): RespuestaActuador
    {
        return $this->para($actuador)->consultarPendiente($actuador);
    }

    private function para(Actuador $actuador): DriverHardware
    {
        return match (true) {
            $actuador->esp32PorInternet() => $this->remoto,
            $actuador->esp32Local() => $this->real,
            default => $this->base,
        };
    }
}

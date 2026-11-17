<?php

namespace App\Drivers;

use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Habla por HTTP con el sketch del ESP32 (rutas /on, /off y /estado; todas responden {"on": true|false}).
 * Devuelve null si el ESP32 no responde o responde algo que no se entiende.
 */
class ClienteEsp32
{
    public function estado(string $direccion): ?bool
    {
        return $this->pedir($direccion, '/estado');
    }

    /** Ordena encender (true) o apagar (false). Devuelve el estado que el ESP32 confirma. */
    public function ordenar(string $direccion, bool $encender): ?bool
    {
        return $this->pedir($direccion, $encender ? '/on' : '/off');
    }

    private function pedir(string $direccion, string $ruta): ?bool
    {
        try {
            $respuesta = Http::connectTimeout((int) config('lumiclass.esp32.timeout_segundos'))
                ->timeout((int) config('lumiclass.esp32.timeout_segundos'))
                ->acceptJson()
                ->get(rtrim($direccion, '/').$ruta);
        } catch (Throwable) {
            return null;
        }

        $encendido = $respuesta->successful() ? $respuesta->json('on') : null;

        return is_bool($encendido) ? $encendido : null;
    }

    /**
     * Acepta "192.168.18.187", "http:192.168.18.187", "http://bombillo.local:80/" … y devuelve "http://host[:puerto]".
     * Devuelve null si no es una dirección válida (solo host y puerto: sin rutas ni usuario).
     */
    public static function normalizar(?string $texto): ?string
    {
        $texto = trim((string) $texto);
        $texto = preg_replace('#^https?:/*#i', '', $texto);
        $texto = rtrim($texto, '/');

        if (! preg_match('/^(?<host>[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*)(:(?<puerto>\d{1,5}))?$/i', $texto, $partes)) {
            return null;
        }

        $puerto = isset($partes['puerto']) && $partes['puerto'] !== '' ? (int) $partes['puerto'] : null;
        if ($puerto !== null && ($puerto < 1 || $puerto > 65535)) {
            return null;
        }

        return 'http://'.strtolower($partes['host']).($puerto !== null && $puerto !== 80 ? ":{$puerto}" : '');
    }
}

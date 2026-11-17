<?php

return [

    /*
    | Driver de sensores y actuadores: "simulado" o "real" (el real llega en la Fase 8).
    */
    'driver' => env('LUMICLASS_DRIVER', 'simulado'),

    'version' => '0.1.0',

    'esp32' => [
        // Lo normal es escribir la dirección de cada ESP32 en "Configurar salón" (por luz).
        // Esta solo se usa con LUMICLASS_DRIVER=real para las luces que no tienen dirección propia.
        'url' => rtrim((string) env('LUMICLASS_ESP32_URL', ''), '/'),
        // Segundos de espera de cada petición al ESP32 antes de darlo por desconectado.
        'timeout_segundos' => (int) env('LUMICLASS_ESP32_TIMEOUT', 2),
        // Cada cuánto se le pregunta su estado a cada ESP32 (detecta desconexiones y cambios hechos desde su página).
        'segundos_sincronizar' => (int) env('LUMICLASS_ESP32_SEGUNDOS_SINCRONIZAR', 5),
        // ESP32 "por internet": cada cuánto llama al servidor y sin latido en cuánto tiempo se da por desconectado.
        'segundos_latido' => (int) env('LUMICLASS_ESP32_SEGUNDOS_LATIDO', 2),
        'segundos_sin_latido' => (int) env('LUMICLASS_ESP32_SEGUNDOS_SIN_LATIDO', 15),
    ],

    'servo' => [
        // Respuesta "lento" del simulador: segundos hasta confirmar la orden.
        'segundos_lento' => (int) env('LUMICLASS_SERVO_SEGUNDOS_LENTO', 5),
        // Sin confirmación en este tiempo, la orden se da por perdida (luz "desconocida").
        'segundos_espera_confirmacion' => (int) env('LUMICLASS_SERVO_SEGUNDOS_ESPERA', 10),
    ],

    'reglas' => [
        // Multiplica la duración de las reglas. 1 = tiempo real; 0.1 = 300 s pasan a 30 s (útil en la demo).
        'factor_tiempo' => (float) env('LUMICLASS_FACTOR_TIEMPO_REGLAS', 1),
    ],

    'tick' => [
        // Mínimo de segundos entre dos revisiones automáticas al consultar /salon/estado.
        'intervalo_minimo_segundos' => 1,
    ],

];

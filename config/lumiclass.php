<?php

return [

    /*
    | Driver de sensores y actuadores: "simulado" o "real" (placa ESP32, ver docs/HARDWARE.md).
    */
    'driver' => env('LUMICLASS_DRIVER', 'simulado'),

    'version' => '0.1.0',

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

    'placa' => [
        // Sin heartbeat en este tiempo, la placa queda "desconectada" y sus sensores y servos "inactivos".
        'segundos_sin_contacto' => (int) env('LUMICLASS_PLACA_SEGUNDOS_SIN_CONTACTO', 30),
        // Cada cuánto la placa envía heartbeat y consulta órdenes (se le informa en cada respuesta).
        'segundos_heartbeat' => 10,
        'milisegundos_ordenes' => 1000,
    ],

    'tick' => [
        // Mínimo de segundos entre dos revisiones automáticas al consultar /salon/estado.
        'intervalo_minimo_segundos' => 1,
    ],

];

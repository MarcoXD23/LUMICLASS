<?php

return [

    /*
    | Driver de sensores y actuadores: "simulado" o "real" (el real llega en la Fase 8).
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

    'tick' => [
        // Mínimo de segundos entre dos revisiones automáticas al consultar /salon/estado.
        'intervalo_minimo_segundos' => 1,
    ],

];

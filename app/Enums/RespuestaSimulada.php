<?php

namespace App\Enums;

/** Cómo responde un servo simulado a la próxima orden. */
enum RespuestaSimulada: string
{
    case Ok = 'ok';
    case Falla = 'falla';
    /** Confirma después de config('lumiclass.servo.segundos_lento'). */
    case Lento = 'lento';
    /** Nunca confirma: la orden vence por tiempo de espera. */
    case SinRespuesta = 'sin_respuesta';
}

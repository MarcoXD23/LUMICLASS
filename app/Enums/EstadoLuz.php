<?php

namespace App\Enums;

enum EstadoLuz: string
{
    case Encendida = 'encendida';
    case Apagada = 'apagada';
    /** Sin confirmación del hardware (p. ej. el servo no respondió o aún no hay driver). */
    case Desconocida = 'desconocida';
}

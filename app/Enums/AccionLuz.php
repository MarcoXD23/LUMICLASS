<?php

namespace App\Enums;

enum AccionLuz: string
{
    case Encender = 'encender';
    case Apagar = 'apagar';

    public function estadoObjetivo(): EstadoLuz
    {
        return match ($this) {
            self::Encender => EstadoLuz::Encendida,
            self::Apagar => EstadoLuz::Apagada,
        };
    }
}

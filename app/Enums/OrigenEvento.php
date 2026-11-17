<?php

namespace App\Enums;

enum OrigenEvento: string
{
    case Usuario = 'usuario';
    case Regla = 'regla';
    case Sistema = 'sistema';
    case Simulador = 'simulador';
    /** Lecturas y confirmaciones que envía la placa ESP32 (Fase 8). */
    case Placa = 'placa';
}

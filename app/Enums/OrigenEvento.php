<?php

namespace App\Enums;

enum OrigenEvento: string
{
    case Usuario = 'usuario';
    case Regla = 'regla';
    case Sistema = 'sistema';
    case Simulador = 'simulador';
}

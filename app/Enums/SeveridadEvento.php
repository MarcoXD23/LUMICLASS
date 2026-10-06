<?php

namespace App\Enums;

enum SeveridadEvento: string
{
    case Info = 'info';
    case Advertencia = 'advertencia';
    case Error = 'error';
}

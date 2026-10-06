<?php

namespace App\Enums;

enum EstadoConexion: string
{
    case Activo = 'activo';
    case Inactivo = 'inactivo';
    case Falla = 'falla';
}

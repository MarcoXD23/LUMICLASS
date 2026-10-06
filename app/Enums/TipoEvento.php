<?php

namespace App\Enums;

enum TipoEvento: string
{
    case LuzComando = 'luz.comando';
    case ComandoRechazado = 'comando.rechazado';
    case ZonaModo = 'zona.modo';
    case ReglaCreada = 'regla.creada';
    case ReglaActualizada = 'regla.actualizada';
    case ReglaEliminada = 'regla.eliminada';
}

<?php

namespace App\Enums;

/** Resultado de enviar una orden a un servo. */
enum EstadoOrden: string
{
    case Completada = 'completada';
    /** El servo aún no confirma; se revisa en cada tick. */
    case Pendiente = 'pendiente';
    case Fallida = 'fallida';
}

<?php

namespace App\Enums;

/** Para qué sirve un código de 6 dígitos. Un código de un propósito no vale para otro. */
enum PropositoCodigo: string
{
    case RecuperarPrincipal = 'recuperar_principal';
    case RecuperarAlternativo = 'recuperar_alternativo';
    case VerificarAlternativo = 'verificar_alternativo';
}

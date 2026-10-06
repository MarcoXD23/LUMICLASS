<?php

namespace App\Servicios;

use App\Enums\ModoZona;
use App\Enums\OrigenEvento;
use App\Enums\TipoEvento;
use App\Models\Zona;

class ServicioZonas
{
    public function __construct(private readonly RegistroEventos $eventos) {}

    /** Devuelve true si el modo cambió. Pedir el mismo modo no genera evento. */
    public function cambiarModo(Zona $zona, ModoZona $modo, OrigenEvento $origen, ?string $motivo = null): bool
    {
        if ($zona->modo === $modo) {
            return false;
        }

        $anterior = $zona->modo;
        $zona->modo = $modo;
        $zona->save();

        $mensaje = "La zona \"{$zona->nombre}\" pasó a modo {$modo->value}.";

        $this->eventos->registrar(
            TipoEvento::ZonaModo,
            $origen,
            $motivo ? "{$mensaje} {$motivo}" : $mensaje,
            $zona,
            ['modo_anterior' => $anterior->value, 'modo_nuevo' => $modo->value],
        );

        return true;
    }
}

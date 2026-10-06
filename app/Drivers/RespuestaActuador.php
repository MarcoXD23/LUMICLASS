<?php

namespace App\Drivers;

use App\Enums\EstadoOrden;

final readonly class RespuestaActuador
{
    private function __construct(
        public EstadoOrden $estado,
        public string $mensaje,
    ) {}

    public static function completada(string $mensaje = 'Orden confirmada por el servo.'): self
    {
        return new self(EstadoOrden::Completada, $mensaje);
    }

    public static function pendiente(string $mensaje = 'Orden enviada; esperando confirmación del servo.'): self
    {
        return new self(EstadoOrden::Pendiente, $mensaje);
    }

    public static function fallida(string $mensaje): self
    {
        return new self(EstadoOrden::Fallida, $mensaje);
    }
}

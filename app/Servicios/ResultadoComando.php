<?php

namespace App\Servicios;

use App\Enums\EstadoOrden;
use App\Models\Luz;

final readonly class ResultadoComando
{
    /** @param  EstadoOrden|null  $orden  null = no hizo falta mover el servo */
    public function __construct(
        public Luz $luz,
        public ?EstadoOrden $orden,
        public string $mensaje,
    ) {}

    public function cambio(): bool
    {
        return $this->orden !== null;
    }

    /** "completada", "pendiente", "fallida" o "sin_cambio". */
    public function resultado(): string
    {
        return $this->orden?->value ?? 'sin_cambio';
    }
}

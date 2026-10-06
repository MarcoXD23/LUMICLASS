<?php

namespace App\Servicios;

use App\Models\Luz;

final readonly class ResultadoComando
{
    public function __construct(
        public Luz $luz,
        public bool $cambio,
        public string $mensaje,
    ) {}
}

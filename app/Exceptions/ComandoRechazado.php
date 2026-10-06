<?php

namespace App\Exceptions;

use App\Http\RespuestaError;
use Illuminate\Http\JsonResponse;
use RuntimeException;

/** Orden que no se puede ejecutar por el estado actual (servo ocupado, en falla, etc.). */
class ComandoRechazado extends RuntimeException
{
    public function __construct(
        public readonly string $codigo,
        string $mensaje,
        public readonly int $estadoHttp = 409,
    ) {
        parent::__construct($mensaje);
    }

    public function render(): JsonResponse
    {
        return RespuestaError::json($this->codigo, $this->getMessage(), $this->estadoHttp);
    }
}

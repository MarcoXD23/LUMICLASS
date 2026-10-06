<?php

namespace App\Enums;

use App\Models\Sensor;
use Illuminate\Support\Collection;

enum Ocupacion: string
{
    case Ocupado = 'ocupado';
    case Vacio = 'vacio';
    /** Ningún sensor activo tiene lectura. */
    case Desconocida = 'desconocida';

    /**
     * @param  Collection<int, Sensor>  $sensores
     */
    public static function desdeSensores(Collection $sensores): self
    {
        $conLectura = $sensores->filter(
            fn (Sensor $sensor) => $sensor->conexion === EstadoConexion::Activo && $sensor->presencia !== null,
        );

        if ($conLectura->isEmpty()) {
            return self::Desconocida;
        }

        return $conLectura->contains(fn (Sensor $sensor) => $sensor->presencia) ? self::Ocupado : self::Vacio;
    }
}

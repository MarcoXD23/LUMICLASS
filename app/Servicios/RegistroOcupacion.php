<?php

namespace App\Servicios;

use App\Enums\Ocupacion;
use App\Models\CambioOcupacion;
use App\Models\Zona;

/** Anota en cambios_ocupacion cuándo una zona pasa a ocupada, vacía o sin datos (base de las estadísticas). */
class RegistroOcupacion
{
    public function actualizar(Zona $zona): void
    {
        $actual = Ocupacion::desdeSensores($zona->sensores()->get());

        $anterior = CambioOcupacion::query()
            ->where('zona_id', $zona->id)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->value('ocupacion');

        // Sin filas previas la zona se considera "sin datos": no hace falta anotarlo.
        if (($anterior ?? Ocupacion::Desconocida) !== $actual) {
            CambioOcupacion::create(['zona_id' => $zona->id, 'ocupacion' => $actual]);
        }
    }
}

<?php

namespace App\Models;

use Illuminate\Support\Collection;

/** Número del conector de la placa (1, 2, 3…) que usa un sensor o un servo dentro de su salón. */
final class NumeroEnPlaca
{
    /** Máximo PROPUESTA: más que los pines libres de un ESP32 para servos o PIR. */
    public const MAXIMO = 20;

    /** @param  Collection<int, int|null>  $usados */
    public static function primeroLibre(Collection $usados): int
    {
        $usados = $usados->filter()->map(fn ($n) => (int) $n)->all();

        for ($numero = 1; in_array($numero, $usados, true); $numero++);

        return $numero;
    }
}

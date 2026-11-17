<?php

namespace App\Console\Commands;

use App\Servicios\ServicioTick;
use Illuminate\Console\Command;

class LumiclassTick extends Command
{
    protected $signature = 'lumiclass:tick';

    protected $description = 'Revisa órdenes pendientes de los servos y evalúa las reglas que dependen del tiempo';

    public function handle(ServicioTick $tick): int
    {
        $resultado = $tick->ejecutar();

        if ($resultado['omitido']) {
            $this->line('Otro tick está en curso; se omite este.');

            return self::SUCCESS;
        }

        $this->info("Órdenes pendientes revisadas: {$resultado['pendientes_revisadas']}. Órdenes enviadas por reglas: {$resultado['ordenes_reglas']}.");

        return self::SUCCESS;
    }
}

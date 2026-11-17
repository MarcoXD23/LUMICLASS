<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * El equipo eligió el ESP32 con relé por luz (rama esp32-por-internet) como diseño definitivo del hardware.
 * Quita lo que dejó la placa del salón con servos (Fase 8). Revisa cada columna antes de quitarla para que sirva
 * tanto en bases que corrieron la Fase 8 como en las que no.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('placas');

        $columnas = array_values(array_filter(
            ['numero_en_placa', 'orden_codigo', 'confirmacion_resultado', 'confirmacion_mensaje'],
            fn (string $columna) => Schema::hasColumn('actuadores', $columna),
        ));
        if ($columnas !== []) {
            Schema::table('actuadores', fn (Blueprint $table) => $table->dropColumn($columnas));
        }

        if (Schema::hasColumn('sensores', 'numero_en_placa')) {
            Schema::table('sensores', fn (Blueprint $table) => $table->dropColumn('numero_en_placa'));
        }
    }

    public function down(): void
    {
        // No se recupera la Fase 8: su código ya no existe en el proyecto (está en el commit 0a373b3).
    }
};

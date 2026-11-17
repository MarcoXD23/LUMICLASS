<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('actuadores', function (Blueprint $table) {
            // ESP32 "por internet": la placa llama al servidor con esta clave (se guarda solo su SHA-256).
            $table->string('clave_hash', 64)->nullable()->unique()->after('direccion');
            // Último estado del relé que informó la placa (true = encendido).
            $table->boolean('estado_reportado')->nullable()->after('ultima_respuesta_en');
        });
    }

    public function down(): void
    {
        Schema::table('actuadores', function (Blueprint $table) {
            $table->dropUnique(['clave_hash']);
            $table->dropColumn(['clave_hash', 'estado_reportado']);
        });
    }
};

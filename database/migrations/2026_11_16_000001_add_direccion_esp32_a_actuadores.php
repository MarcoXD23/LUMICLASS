<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('actuadores', function (Blueprint $table) {
            // Dirección del ESP32 que mueve esta luz (p. ej. http://192.168.18.187). Vacía = driver del .env.
            $table->string('direccion', 120)->nullable()->after('nombre');
            // Última vez que el ESP32 respondió: sirve para ver si sigue conectado.
            $table->timestamp('ultima_respuesta_en')->nullable()->after('ultimo_resultado');
        });
    }

    public function down(): void
    {
        Schema::table('actuadores', function (Blueprint $table) {
            $table->dropColumn(['direccion', 'ultima_respuesta_en']);
        });
    }
};

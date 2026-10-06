<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Guarda la respuesta de cada orden para no ejecutarla dos veces si llega repetida.
        Schema::create('solicitudes_procesadas', function (Blueprint $table) {
            $table->id();
            $table->uuid('id_solicitud')->unique();
            $table->string('ruta', 255);
            $table->unsignedSmallInteger('codigo_http');
            $table->json('respuesta');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('solicitudes_procesadas');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Base de las estadísticas: cada fila dice "desde este momento, la luz (o la zona) está así".
 * Con eso se calculan tiempos exactos (horas encendidas, ocupado, luz encendida con la zona vacía).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cambios_luz', function (Blueprint $table) {
            $table->id();
            $table->foreignId('luz_id')->constrained('luces')->cascadeOnDelete();
            $table->string('estado', 20);
            $table->timestamp('created_at')->useCurrent();

            $table->index(['luz_id', 'created_at']);
        });

        Schema::create('cambios_ocupacion', function (Blueprint $table) {
            $table->id();
            $table->foreignId('zona_id')->constrained('zonas')->cascadeOnDelete();
            $table->string('ocupacion', 20);
            $table->timestamp('created_at')->useCurrent();

            $table->index(['zona_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cambios_ocupacion');
        Schema::dropIfExists('cambios_luz');
    }
};

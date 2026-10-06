<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sensores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('zona_id')->constrained('zonas')->cascadeOnDelete();
            $table->string('nombre', 100);
            $table->string('tipo', 30);
            $table->string('conexion', 20)->default('activo');
            // null = todavía no hay lectura.
            $table->boolean('presencia')->nullable();
            // Solo si el hardware puede contar personas.
            $table->unsignedSmallInteger('conteo_personas')->nullable();
            $table->timestamp('ultima_lectura')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sensores');
    }
};

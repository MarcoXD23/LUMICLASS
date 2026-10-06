<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reglas', function (Blueprint $table) {
            $table->id();
            // null = la regla aplica a todas las zonas.
            $table->foreignId('zona_id')->nullable()->constrained('zonas')->cascadeOnDelete();
            $table->string('nombre', 100);
            $table->boolean('activa')->default(true);
            $table->unsignedSmallInteger('prioridad')->default(100);
            $table->json('condicion');
            $table->json('accion');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reglas');
    }
};

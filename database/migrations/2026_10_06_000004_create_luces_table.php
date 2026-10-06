<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('luces', function (Blueprint $table) {
            $table->id();
            $table->foreignId('zona_id')->constrained('zonas')->cascadeOnDelete();
            // Un servo acciona un solo interruptor.
            $table->foreignId('actuador_id')->nullable()->unique()->constrained('actuadores')->nullOnDelete();
            $table->string('nombre', 100);
            $table->string('estado_deseado', 20)->default('apagada');
            $table->string('estado_real', 20)->default('desconocida');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('luces');
    }
};

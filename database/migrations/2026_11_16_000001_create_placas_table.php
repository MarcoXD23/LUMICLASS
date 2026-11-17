<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Fase 8: la placa ESP32 de cada salón. La clave se guarda como hash SHA-256 (nunca en texto). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('placas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('salon_id')->unique()->constrained('salones')->cascadeOnDelete();
            $table->char('clave_hash', 64)->unique();
            // true desde el primer heartbeat hasta pasar el tiempo sin contacto (lo revisa el tick).
            $table->boolean('en_linea')->default(false);
            $table->timestamp('ultimo_contacto')->nullable();
            $table->string('ip', 45)->nullable();
            $table->string('version_firmware', 20)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('placas');
    }
};

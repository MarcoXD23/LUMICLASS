<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Recuperar contraseña con código de 6 dígitos (al correo principal o al alternativo verificado).
 * El SQL equivalente para phpMyAdmin está en database/sql/cambios_hosting.sql.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Solo el correo alternativo YA verificado sirve para recuperar.
            $table->string('correo_alternativo')->nullable()->unique()->after('email');
            $table->timestamp('correo_alternativo_verificado_en')->nullable()->after('correo_alternativo');
            // El que se está verificando; el anterior sigue activo hasta confirmar este.
            $table->string('correo_alternativo_pendiente')->nullable()->after('correo_alternativo_verificado_en');
        });

        // Un código activo por cuenta y propósito: pedir uno nuevo reemplaza al anterior.
        Schema::create('codigos_verificacion', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('proposito', 30);
            $table->string('destino');
            // Nunca el código en texto plano.
            $table->string('codigo_hash');
            $table->timestamp('expira_en');
            $table->timestamps();

            $table->unique(['user_id', 'proposito']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('codigos_verificacion');

        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['correo_alternativo']);
            $table->dropColumn(['correo_alternativo', 'correo_alternativo_verificado_en', 'correo_alternativo_pendiente']);
        });
    }
};

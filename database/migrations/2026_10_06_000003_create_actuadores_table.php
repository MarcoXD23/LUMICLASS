<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('actuadores', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 100);
            $table->string('conexion', 20)->default('activo');
            // true mientras el servo ejecuta una orden: evita dos órdenes a la vez.
            $table->boolean('ocupado')->default(false);
            $table->string('ultimo_resultado', 255)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('actuadores');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('eventos', function (Blueprint $table) {
            $table->id();
            $table->string('tipo', 40)->index();
            $table->string('origen', 20);
            $table->string('severidad', 20)->index();
            $table->string('entidad_tipo', 40)->nullable();
            $table->unsignedBigInteger('entidad_id')->nullable();
            $table->string('mensaje', 255);
            $table->json('datos')->nullable();
            $table->timestamp('created_at')->useCurrent()->index();

            $table->index(['entidad_tipo', 'entidad_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('eventos');
    }
};

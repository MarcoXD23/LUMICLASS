<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('actuadores', function (Blueprint $table) {
            // Orden enviada que el servo aún no confirma ("encender" o "apagar").
            $table->string('orden_pendiente', 20)->nullable()->after('ocupado');
            $table->timestamp('orden_iniciada_en')->nullable()->after('orden_pendiente');
        });

        Schema::table('sensores', function (Blueprint $table) {
            // Momento en que cambió la presencia: lo usan las reglas con duración.
            $table->timestamp('presencia_desde')->nullable()->after('presencia');
        });
    }

    public function down(): void
    {
        Schema::table('actuadores', function (Blueprint $table) {
            $table->dropColumn(['orden_pendiente', 'orden_iniciada_en']);
        });

        Schema::table('sensores', function (Blueprint $table) {
            $table->dropColumn('presencia_desde');
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Fase 8: "numero_en_placa" une cada sensor y cada servo con su conector en la placa (1 = primer pin).
 * "orden_codigo" identifica la orden que la placa debe confirmar; "confirmacion_*" guarda su respuesta.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sensores', function (Blueprint $table) {
            $table->unsignedTinyInteger('numero_en_placa')->nullable()->after('tipo');
        });

        Schema::table('actuadores', function (Blueprint $table) {
            $table->unsignedTinyInteger('numero_en_placa')->nullable()->after('nombre');
            $table->string('orden_codigo', 16)->nullable()->after('orden_iniciada_en');
            $table->string('confirmacion_resultado', 10)->nullable()->after('orden_codigo');
            $table->string('confirmacion_mensaje', 200)->nullable()->after('confirmacion_resultado');
        });

        // Numera lo que ya existe: 1, 2, 3… por salón, en el orden en que se creó.
        foreach (DB::table('salones')->pluck('id') as $salonId) {
            $numero = 1;
            foreach (DB::table('actuadores')->where('salon_id', $salonId)->orderBy('id')->pluck('id') as $id) {
                DB::table('actuadores')->where('id', $id)->update(['numero_en_placa' => $numero++]);
            }

            $numero = 1;
            $zonas = DB::table('zonas')->where('salon_id', $salonId)->pluck('id');
            foreach (DB::table('sensores')->whereIn('zona_id', $zonas)->orderBy('id')->pluck('id') as $id) {
                DB::table('sensores')->where('id', $id)->update(['numero_en_placa' => $numero++]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('actuadores', function (Blueprint $table) {
            $table->dropColumn(['numero_en_placa', 'orden_codigo', 'confirmacion_resultado', 'confirmacion_mensaje']);
        });

        Schema::table('sensores', function (Blueprint $table) {
            $table->dropColumn('numero_en_placa');
        });
    }
};

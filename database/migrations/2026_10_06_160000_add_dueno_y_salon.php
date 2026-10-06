<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Cuentas multiusuario: cada salón tiene dueño y todo lo demás cuelga de un salón.
 * Las columnas son nullable solo para no romper bases existentes; los datos nuevos siempre las llenan.
 * En una base de desarrollo anterior conviene ejecutar: php artisan migrate:fresh --seed
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('salones', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('id')->constrained('users')->cascadeOnDelete();
        });

        Schema::table('actuadores', function (Blueprint $table) {
            $table->foreignId('salon_id')->nullable()->after('id')->constrained('salones')->cascadeOnDelete();
        });

        Schema::table('reglas', function (Blueprint $table) {
            // Una regla sin zona aplica a todas las zonas de SU salón.
            $table->foreignId('salon_id')->nullable()->after('id')->constrained('salones')->cascadeOnDelete();
        });

        Schema::table('eventos', function (Blueprint $table) {
            $table->foreignId('salon_id')->nullable()->after('id')->constrained('salones')->cascadeOnDelete();
        });

        Schema::table('solicitudes_procesadas', function (Blueprint $table) {
            // El id_solicitud es único por usuario, no en todo el sistema.
            $table->foreignId('user_id')->nullable()->after('id')->constrained('users')->cascadeOnDelete();
            $table->dropUnique(['id_solicitud']);
            $table->unique(['user_id', 'id_solicitud']);
        });
    }

    public function down(): void
    {
        Schema::table('solicitudes_procesadas', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'id_solicitud']);
            $table->unique('id_solicitud');
            $table->dropConstrainedForeignId('user_id');
        });

        foreach (['eventos', 'reglas', 'actuadores'] as $tabla) {
            Schema::table($tabla, fn (Blueprint $table) => $table->dropConstrainedForeignId('salon_id'));
        }

        Schema::table('salones', fn (Blueprint $table) => $table->dropConstrainedForeignId('user_id'));
    }
};

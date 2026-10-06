<?php

namespace App\Console\Commands;

use App\Enums\OrigenEvento;
use App\Enums\TipoEvento;
use App\Models\User;
use App\Servicios\CreadorSalon;
use App\Servicios\HistoriaDeEjemplo;
use App\Servicios\RegistroEventos;
use App\Servicios\Simulador;
use Database\Seeders\SalonDemoSeeder;
use Illuminate\Console\Command;
use Illuminate\Console\ConfirmableTrait;

/**
 * Deja la CUENTA DEMO lista para presentar. No toca ninguna otra cuenta.
 * Uso: php artisan lumiclass:demo --zona-horaria=America/Bogota
 */
class PrepararDemo extends Command
{
    use ConfirmableTrait;

    protected $signature = 'lumiclass:demo
        {--dias=7 : Días de historia de ejemplo (1 a 30)}
        {--zona-horaria= : Zona horaria para las horas de clase, p. ej. America/Bogota (por defecto la de la app)}
        {--force : Ejecutar aunque la app esté en producción}';

    protected $description = 'Prepara la cuenta demo para presentar: simulador reiniciado, historial limpio y días de ejemplo en Estadísticas';

    public function handle(CreadorSalon $creador, Simulador $simulador, HistoriaDeEjemplo $historia, RegistroEventos $eventos): int
    {
        if (! $this->confirmToProceed('La app está en producción: esto reescribe los datos de la cuenta demo.')) {
            return self::FAILURE;
        }

        $dias = (int) $this->option('dias');
        $zonaHoraria = $this->option('zona-horaria') ?: config('app.timezone');

        if ($dias < 1 || $dias > 30) {
            $this->error('--dias debe estar entre 1 y 30.');

            return self::INVALID;
        }
        if (! in_array($zonaHoraria, timezone_identifiers_list(), true)) {
            $this->error("Zona horaria desconocida: {$zonaHoraria}. Ejemplo: America/Bogota");

            return self::INVALID;
        }

        $demo = User::query()->where('email', SalonDemoSeeder::CORREO)->first();
        if ($demo === null) {
            $this->call('db:seed', ['--class' => SalonDemoSeeder::class, '--force' => true]);
            $demo = User::query()->where('email', SalonDemoSeeder::CORREO)->firstOrFail();
        }

        $salon = $demo->salones()->orderBy('id')->first() ?? $creador->crearEjemplo($demo);

        // Historial limpio para la presentación (solo de este salón de la cuenta demo).
        $salon->eventos()->delete();
        $resultado = $historia->generar($salon, $dias, $zonaHoraria);
        $simulador->reiniciar($salon);
        $eventos->registrar(
            TipoEvento::DemoPreparada,
            OrigenEvento::Sistema,
            "Se cargaron {$dias} días de historia de ejemplo para la demo (no son mediciones reales).",
            $salon,
        );

        $this->info("Cuenta demo lista: salón \"{$salon->nombre}\" (id {$salon->id}).");
        $this->line("Historia de ejemplo: {$dias} días ({$resultado['cambios_luz']} cambios de luces, {$resultado['cambios_ocupacion']} de ocupación), hora local {$zonaHoraria}.");
        $this->line('Ingresa con '.SalonDemoSeeder::CORREO.' / '.SalonDemoSeeder::CONTRASENA);

        return self::SUCCESS;
    }
}

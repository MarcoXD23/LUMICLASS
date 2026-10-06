<?php

namespace Database\Seeders;

use App\Models\User;
use App\Servicios\CreadorSalon;
use Illuminate\Database\Seeder;

/**
 * Cuenta de demostración con su salón de ejemplo (cantidades PROPUESTA).
 * Solo para desarrollo y presentación: cambia la contraseña si el sistema se publica.
 */
class SalonDemoSeeder extends Seeder
{
    public const CORREO = 'demo@lumiclass.test';

    public const CONTRASENA = 'demo12345';

    public function run(CreadorSalon $creador): void
    {
        // Se puede ejecutar varias veces sin duplicar la cuenta.
        if (User::query()->where('email', self::CORREO)->exists()) {
            $this->command?->info('La cuenta de demostración ya existe; no se crean datos de ejemplo.');

            return;
        }

        $usuario = User::create(['name' => 'Cuenta demo', 'email' => self::CORREO, 'password' => self::CONTRASENA]);
        $creador->crearEjemplo($usuario);
    }
}

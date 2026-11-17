<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Servicios\CambioDeContrasena;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

/**
 * Cambia la contraseña de una cuenta desde la consola (solo donde haya terminal, no en el hosting).
 * La contraseña se pide oculta y dos veces; nunca va como argumento para que no quede en el historial de la consola.
 * Uso: php artisan lumiclass:cambiar-contrasena ana@correo.com
 */
class CambiarContrasena extends Command
{
    private const MINIMO = 8;

    private const MAXIMO = 100;

    protected $signature = 'lumiclass:cambiar-contrasena {email : Correo de la cuenta}';

    protected $description = 'Cambia la contraseña de una cuenta (la pide oculta), cierra sus sesiones y revoca sus tokens';

    public function handle(CambioDeContrasena $cambio): int
    {
        $email = strtolower(trim((string) $this->argument('email')));
        $usuario = User::query()->where('email', $email)->first();

        if ($usuario === null) {
            $this->error("No existe ninguna cuenta con el correo {$email}. No se cambió nada.");

            return self::FAILURE;
        }

        $nueva = (string) $this->secret('Contraseña nueva (mínimo '.self::MINIMO.' caracteres)');
        $repetida = (string) $this->secret('Repite la contraseña nueva');

        if (mb_strlen($nueva) < self::MINIMO) {
            $this->error('La contraseña debe tener al menos '.self::MINIMO.' caracteres. No se cambió nada.');

            return self::FAILURE;
        }
        if (mb_strlen($nueva) > self::MAXIMO) {
            $this->error('La contraseña no puede tener más de '.self::MAXIMO.' caracteres. No se cambió nada.');

            return self::FAILURE;
        }
        if (! hash_equals($nueva, $repetida)) {
            $this->error('Las contraseñas no coinciden. No se cambió nada.');

            return self::FAILURE;
        }

        // Mismo servicio que las 3 formas de recuperar: revoca tokens, cierra sesiones y deja historial.
        $cambio->aplicar($usuario, Hash::make($nueva), 'comando');

        $conexion = config('database.default');
        $this->info("Contraseña cambiada para {$usuario->email}. Se cerraron sus sesiones y se revocaron sus tokens de la API.");
        $this->line("Base de datos: DB_CONNECTION={$conexion}, DB_DATABASE=".config("database.connections.{$conexion}.database"));

        return self::SUCCESS;
    }
}

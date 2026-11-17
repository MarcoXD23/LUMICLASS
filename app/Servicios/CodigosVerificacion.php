<?php

namespace App\Servicios;

use App\Enums\PropositoCodigo;
use App\Exceptions\ComandoRechazado;
use App\Mail\CodigoMail;
use App\Models\CodigoVerificacion;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Throwable;

/**
 * Códigos de 6 dígitos: se guardan con hash, vencen en 10 minutos, sirven una vez y un código nuevo
 * reemplaza al anterior. Límites: 3 envíos por hora por cuenta y 5 intentos fallidos (luego 15 minutos).
 */
class CodigosVerificacion
{
    public const MINUTOS_VIGENCIA = 10;

    public const MAXIMO_ENVIOS_POR_HORA = 3;

    public const MAXIMO_INTENTOS = 5;

    public const MINUTOS_BLOQUEO = 15;

    /**
     * Crea un código nuevo y lo envía a $destino. Devuelve false si la cuenta ya pidió 3 en la última hora.
     * Si el correo no sale (p. ej. SMTP caído), el error queda en el log y se devuelve true igual:
     * el usuario ve el mismo mensaje y la app no se rompe.
     */
    public function enviar(User $usuario, PropositoCodigo $proposito, string $destino, string $motivo): bool
    {
        $claveEnvios = 'codigos-envios:'.$usuario->id;

        if (RateLimiter::tooManyAttempts($claveEnvios, self::MAXIMO_ENVIOS_POR_HORA)) {
            return false;
        }
        RateLimiter::hit($claveEnvios, 3600);

        $codigo = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        CodigoVerificacion::query()->updateOrCreate(
            ['user_id' => $usuario->id, 'proposito' => $proposito],
            ['destino' => $destino, 'codigo_hash' => Hash::make($codigo), 'expira_en' => now()->addMinutes(self::MINUTOS_VIGENCIA)],
        );

        try {
            Mail::to($destino)->send(new CodigoMail($codigo, $usuario->name, $motivo, self::MINUTOS_VIGENCIA));
        } catch (Throwable $error) {
            report($error);
        }

        return true;
    }

    /**
     * Comprueba el código y lo consume (no se puede reutilizar). $claveIntentos identifica a quién se le cuentan
     * los fallos: el correo escrito en la recuperación (exista o no la cuenta, para no revelar nada) o la cuenta
     * que verifica su correo alternativo.
     *
     * @throws ComandoRechazado 429 si hubo 5 fallos en los últimos 15 minutos; 400 si el código no sirve
     */
    public function consumir(?User $usuario, PropositoCodigo $proposito, string $codigo, string $claveIntentos): CodigoVerificacion
    {
        $clave = 'codigos-intentos:'.sha1($claveIntentos);

        if (RateLimiter::tooManyAttempts($clave, self::MAXIMO_INTENTOS)) {
            throw new ComandoRechazado(
                'demasiados_intentos_codigo',
                'Demasiados códigos incorrectos. Espera '.self::MINUTOS_BLOQUEO.' minutos y vuelve a intentarlo.',
                429,
            );
        }

        $registro = $usuario
            ? CodigoVerificacion::query()->where('user_id', $usuario->id)->where('proposito', $proposito)->first()
            : null;

        $valido = $registro !== null && $registro->expira_en->isFuture() && Hash::check($codigo, $registro->codigo_hash);

        if (! $valido) {
            RateLimiter::hit($clave, self::MINUTOS_BLOQUEO * 60);

            throw new ComandoRechazado('codigo_invalido', 'El código no es válido o ya venció. Pide uno nuevo.', 400);
        }

        $registro->delete();
        RateLimiter::clear($clave);

        return $registro;
    }
}

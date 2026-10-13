<?php

namespace App\Servicios;

use App\Enums\OrigenEvento;
use App\Enums\TipoEvento;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Lo que pasa al cambiar la contraseña por cualquiera de las 3 formas: quien tuviera acceso lo pierde
 * (tokens de la API y sesiones de otros equipos), el usuario queda ingresado y queda en el historial.
 */
class CambioDeContrasena
{
    public const FORMAS = [
        'enlace' => 'enlace por correo',
        'codigo' => 'código por correo',
        'alternativo' => 'código al correo alternativo',
    ];

    public function __construct(private readonly RegistroEventos $eventos) {}

    public function aplicar(User $usuario, string $nueva, string $forma, Request $request): void
    {
        $usuario->forceFill(['password' => $nueva, 'remember_token' => Str::random(60)])->save();

        $usuario->tokens()->delete();
        if (config('session.driver') === 'database') {
            DB::table(config('session.table', 'sessions'))->where('user_id', $usuario->id)->delete();
        }

        event(new PasswordReset($usuario));

        $this->eventos->registrar(
            TipoEvento::CuentaContrasena,
            OrigenEvento::Usuario,
            'Contraseña cambiada con '.self::FORMAS[$forma].'.',
            $usuario,
            ['forma' => $forma],
        );

        if ($request->hasSession()) {
            Auth::guard('web')->login($usuario);
            $request->session()->regenerate();
        }
    }
}

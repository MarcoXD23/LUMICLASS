<?php

namespace App\Providers;

use App\Drivers\DriverHardware;
use App\Drivers\DriverReal;
use App\Drivers\DriverSimulado;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\ServiceProvider;
use InvalidArgumentException;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(DriverHardware::class, fn ($app) => match (config('lumiclass.driver')) {
            'simulado' => $app->make(DriverSimulado::class),
            'real' => $app->make(DriverReal::class),
            default => throw new InvalidArgumentException('LUMICLASS_DRIVER debe ser "simulado" o "real".'),
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Correo de "recuperar contraseña" en español, con el enlace a nuestra pantalla /restablecer.
        $enlace = fn (User $usuario, string $token) => url(route('password.reset', ['token' => $token], false))
            .'?email='.urlencode($usuario->email);

        ResetPassword::createUrlUsing($enlace);

        ResetPassword::toMailUsing(fn (User $usuario, string $token) => (new MailMessage)
            ->subject('Crea una contraseña nueva para LUMICLASS')
            ->greeting("Hola, {$usuario->name}")
            ->line('Recibimos una solicitud para cambiar la contraseña de tu cuenta de LUMICLASS.')
            ->action('Crear contraseña nueva', $enlace($usuario, $token))
            ->line('El enlace vence en '.config('auth.passwords.users.expire').' minutos y sirve una sola vez.')
            ->line('Si no lo pediste, ignora este correo: tu contraseña sigue igual.')
            ->salutation('— Equipo LUMICLASS'));
    }
}

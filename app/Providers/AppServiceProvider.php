<?php

namespace App\Providers;

use App\Drivers\DriverHardware;
use App\Drivers\DriverReal;
use App\Drivers\DriverSimulado;
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
        //
    }
}

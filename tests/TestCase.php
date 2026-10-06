<?php

namespace Tests;

use App\Models\Salon;
use App\Models\User;
use Database\Seeders\SalonDemoSeeder;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Laravel\Sanctum\Sanctum;

abstract class TestCase extends BaseTestCase
{
    /** Inicia sesión con una cuenta nueva (o la dada). Las fábricas crean los salones para esta cuenta. */
    protected function iniciarSesion(?User $usuario = null): User
    {
        $usuario ??= User::factory()->create();
        Sanctum::actingAs($usuario);

        return $usuario;
    }

    /** Crea la cuenta demo con su salón de ejemplo, inicia sesión con ella y devuelve el salón. */
    protected function iniciarSesionDemo(): Salon
    {
        $this->seed(SalonDemoSeeder::class);
        $usuario = User::query()->where('email', SalonDemoSeeder::CORREO)->firstOrFail();
        $this->iniciarSesion($usuario);

        return $usuario->salones()->firstOrFail();
    }
}

<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CambiarContrasenaComandoTest extends TestCase
{
    use RefreshDatabase;

    private const PREGUNTA = 'Contraseña nueva (mínimo 8 caracteres)';

    private const REPETIR = 'Repite la contraseña nueva';

    private User $ana;

    protected function setUp(): void
    {
        parent::setUp();
        $this->ana = User::factory()->create(['email' => 'ana@correo.com', 'password' => 'vieja1234']);
    }

    public function test_cambia_la_contrasena_cierra_sesiones_revoca_tokens_y_deja_historial(): void
    {
        config(['session.driver' => 'database']);
        DB::table('sessions')->insert(['id' => 'sesion-abierta', 'user_id' => $this->ana->id, 'payload' => '', 'last_activity' => time()]);
        $this->ana->createToken('placa');

        $this->artisan('lumiclass:cambiar-contrasena', ['email' => ' Ana@Correo.com '])
            ->expectsQuestion(self::PREGUNTA, 'nueva12345')
            ->expectsQuestion(self::REPETIR, 'nueva12345')
            ->expectsOutputToContain('Contraseña cambiada para ana@correo.com')
            ->expectsOutputToContain('DB_CONNECTION='.config('database.default'))
            ->doesntExpectOutputToContain('nueva12345')
            ->assertSuccessful();

        $this->ana->refresh();
        $this->assertTrue(Hash::check('nueva12345', $this->ana->password));
        $this->assertSame(0, $this->ana->tokens()->count());
        $this->assertSame(0, DB::table('sessions')->where('user_id', $this->ana->id)->count());
        $this->assertDatabaseHas('eventos', ['tipo' => 'cuenta.contrasena', 'entidad_id' => $this->ana->id]);
    }

    public function test_rechaza_un_correo_que_no_existe(): void
    {
        $this->artisan('lumiclass:cambiar-contrasena', ['email' => 'nadie@correo.com'])
            ->expectsOutputToContain('No existe ninguna cuenta con el correo nadie@correo.com')
            ->assertFailed();
    }

    public function test_rechaza_contrasenas_distintas_sin_cambiar_nada(): void
    {
        $this->artisan('lumiclass:cambiar-contrasena', ['email' => 'ana@correo.com'])
            ->expectsQuestion(self::PREGUNTA, 'nueva12345')
            ->expectsQuestion(self::REPETIR, 'otra123456')
            ->expectsOutputToContain('Las contraseñas no coinciden')
            ->assertFailed();

        $this->assertTrue(Hash::check('vieja1234', $this->ana->fresh()->password));
    }

    public function test_rechaza_contrasenas_de_menos_de_8_caracteres(): void
    {
        $this->artisan('lumiclass:cambiar-contrasena', ['email' => 'ana@correo.com'])
            ->expectsQuestion(self::PREGUNTA, 'corta1')
            ->expectsQuestion(self::REPETIR, 'corta1')
            ->expectsOutputToContain('al menos 8 caracteres')
            ->assertFailed();

        $this->assertTrue(Hash::check('vieja1234', $this->ana->fresh()->password));
    }
}

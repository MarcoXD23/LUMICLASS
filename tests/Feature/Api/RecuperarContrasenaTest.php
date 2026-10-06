<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class RecuperarContrasenaTest extends TestCase
{
    use RefreshDatabase;

    private const MENSAJE = 'Si el correo está registrado, te enviamos un enlace para crear una contraseña nueva. Revisa también la carpeta de spam.';

    private User $ana;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        $this->ana = User::factory()->create(['name' => 'Ana', 'email' => 'ana@ejemplo.com', 'password' => 'vieja1234']);
    }

    private function pedirEnlace(string $email)
    {
        return $this->postJson('/api/v1/auth/olvide', ['email' => $email]);
    }

    private function restablecer(string $token, array $cambios = [])
    {
        return $this->withHeader('Referer', config('app.url'))->postJson('/api/v1/auth/restablecer', array_replace([
            'token' => $token,
            'email' => 'ana@ejemplo.com',
            'password' => 'nueva12345',
            'password_confirmation' => 'nueva12345',
        ], $cambios));
    }

    public function test_envia_el_enlace_en_espanol_a_una_cuenta_existente(): void
    {
        $this->pedirEnlace('ANA@ejemplo.com')->assertOk()->assertJsonPath('mensaje', self::MENSAJE);

        Notification::assertSentTo($this->ana, ResetPassword::class, function (ResetPassword $aviso) {
            $correo = $aviso->toMail($this->ana);
            $enlace = url("/restablecer/{$aviso->token}").'?email=ana%40ejemplo.com';

            return $correo->subject === 'Crea una contraseña nueva para LUMICLASS'
                && $correo->greeting === 'Hola, Ana'
                && $correo->actionText === 'Crear contraseña nueva'
                && $correo->actionUrl === $enlace
                && str_contains(implode(' ', $correo->outroLines), 'vence en 60 minutos');
        });
    }

    public function test_un_correo_que_no_existe_recibe_la_misma_respuesta_y_no_se_envia_nada(): void
    {
        $existe = $this->pedirEnlace('ana@ejemplo.com')->json();
        $noExiste = $this->pedirEnlace('nadie@ejemplo.com')->assertOk()->json();

        $this->assertSame($existe, $noExiste);
        Notification::assertSentTimes(ResetPassword::class, 1);
    }

    public function test_pedirlo_dos_veces_seguidas_no_envia_dos_correos_ni_lo_delata(): void
    {
        $this->pedirEnlace('ana@ejemplo.com')->assertOk();
        $this->pedirEnlace('ana@ejemplo.com')->assertOk()->assertJsonPath('mensaje', self::MENSAJE);

        Notification::assertSentTimes(ResetPassword::class, 1);
    }

    public function test_con_el_enlace_cambia_la_contrasena_entra_y_cierra_las_demas_sesiones(): void
    {
        config(['session.driver' => 'database']); // como en el servidor real
        $tokenApi = $this->ana->createToken('celular')->plainTextToken;
        DB::table('sessions')->insert(['id' => 'otra-sesion', 'user_id' => $this->ana->id, 'payload' => '', 'last_activity' => time()]);
        $token = Password::broker()->createToken($this->ana);

        $this->restablecer($token)
            ->assertOk()
            ->assertJsonPath('data.email', 'ana@ejemplo.com')
            ->assertJsonPath('mensaje', 'Listo: tu contraseña se cambió y ya ingresaste con la nueva.');

        $this->assertTrue(Hash::check('nueva12345', $this->ana->fresh()->password));
        $this->assertSame(0, $this->ana->tokens()->count());
        $this->assertSame(0, DB::table('sessions')->where('id', 'otra-sesion')->count());
        $this->getJson('/api/v1/auth/yo')->assertOk()->assertJsonPath('data.email', 'ana@ejemplo.com');

        // El token viejo de la API (otro equipo, sin la cookie de esta sesión) ya no sirve.
        $this->flushHeaders();
        $this->flushSession();
        $this->app['auth']->forgetGuards();
        $this->withToken($tokenApi)->getJson('/api/v1/auth/yo')->assertUnauthorized();
    }

    public function test_el_enlace_sirve_una_sola_vez(): void
    {
        $token = Password::broker()->createToken($this->ana);

        $this->restablecer($token)->assertOk();
        $this->restablecer($token, ['password' => 'otra123456', 'password_confirmation' => 'otra123456'])
            ->assertStatus(400)
            ->assertJsonPath('error.codigo', 'enlace_invalido');
    }

    public function test_el_enlace_vence_a_los_60_minutos(): void
    {
        $token = Password::broker()->createToken($this->ana);
        $this->travel(61)->minutes();

        $this->restablecer($token)
            ->assertStatus(400)
            ->assertJsonPath('error.mensaje', 'El enlace no es válido o ya venció. Pide uno nuevo.');
        $this->assertTrue(Hash::check('vieja1234', $this->ana->fresh()->password));
    }

    public function test_un_enlace_inventado_o_de_otra_cuenta_no_sirve_y_no_delata_correos(): void
    {
        $token = Password::broker()->createToken($this->ana);
        User::factory()->create(['email' => 'beto@ejemplo.com']);

        $inventado = $this->restablecer('token-inventado')->assertStatus(400)->json();
        $otraCuenta = $this->restablecer($token, ['email' => 'beto@ejemplo.com'])->assertStatus(400)->json();
        $noExiste = $this->restablecer($token, ['email' => 'nadie@ejemplo.com'])->assertStatus(400)->json();

        $this->assertSame($inventado, $otraCuenta);
        $this->assertSame($inventado, $noExiste);
        $this->assertTrue(Hash::check('vieja1234', $this->ana->fresh()->password));
    }

    public function test_valida_la_contrasena_nueva_en_espanol(): void
    {
        $token = Password::broker()->createToken($this->ana);

        $this->restablecer($token, ['password' => 'corta', 'password_confirmation' => 'corta'])
            ->assertStatus(400)
            ->assertJsonPath('error.detalles.password.0', 'El campo contraseña debe tener al menos 8 caracteres.');
        $this->restablecer($token, ['password_confirmation' => 'distinta123'])
            ->assertJsonPath('error.detalles.password.0', 'La confirmación de contraseña no coincide.');
        $this->pedirEnlace('no-es-correo')
            ->assertStatus(400)
            ->assertJsonPath('error.detalles.email.0', 'El campo correo debe ser un correo electrónico válido.');
    }

    public function test_si_el_correo_falla_responde_igual_y_queda_en_el_log(): void
    {
        Notification::shouldReceive('send')->andThrow(new \RuntimeException('SMTP no responde'));

        $this->pedirEnlace('ana@ejemplo.com')->assertOk()->assertJsonPath('mensaje', self::MENSAJE);
    }

    public function test_paginas_de_olvide_y_restablecer(): void
    {
        $this->get('/ingresar')->assertSee('¿Olvidaste tu contraseña?')->assertSee('/olvide', false);
        $this->get('/olvide')->assertOk()->assertSee('Enviar enlace');
        $this->get('/restablecer/abc123?email=ana%40ejemplo.com')->assertOk()->assertSee('Crea una contraseña nueva');

        $this->actingAs($this->ana);
        $this->get('/olvide')->assertRedirect('/salones');
    }

    public function test_un_token_o_correo_malicioso_en_la_url_no_inyecta_codigo(): void
    {
        $this->get("/restablecer/x'%29%3Balert%281%29%3B?email=%22%3E%3Cscript%3Ealert(2)%3C/script%3E")
            ->assertOk()
            ->assertDontSee('<script>alert(2)</script>', false)
            ->assertDontSee("x');alert(1);", false);
    }
}

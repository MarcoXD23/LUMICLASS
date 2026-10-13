<?php

namespace Tests\Feature\Api;

use App\Mail\CodigoMail;
use App\Models\CodigoVerificacion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

/** Formas 2 (código al correo principal) y 3 (código al correo alternativo verificado). */
class RecuperarConCodigoTest extends TestCase
{
    use RefreshDatabase;

    private const MENSAJE_CORREO = 'Si la cuenta existe, te enviamos un código de 6 dígitos. Revisa también la carpeta de spam.';

    private const MENSAJE_ALTERNATIVO = 'Si la cuenta existe y tiene un correo alternativo verificado, te enviamos un código de 6 dígitos a ese correo.';

    private User $ana;

    protected function setUp(): void
    {
        parent::setUp();

        Mail::fake();
        $this->ana = User::factory()->create(['name' => 'Ana', 'email' => 'ana@ejemplo.com', 'password' => 'vieja1234']);
    }

    private function pedir(string $email, string $via = 'correo')
    {
        return $this->postJson('/api/v1/auth/codigo', ['email' => $email, 'via' => $via]);
    }

    private function cambiar(string $codigo, string $via = 'correo', string $email = 'ana@ejemplo.com')
    {
        return $this->withHeader('Referer', config('app.url'))->postJson('/api/v1/auth/codigo/restablecer', [
            'email' => $email, 'via' => $via, 'codigo' => $codigo,
            'password' => 'nueva12345', 'password_confirmation' => 'nueva12345',
        ]);
    }

    /** El último código enviado a ese correo (lo que el usuario leería en su bandeja). */
    private function codigoEnviadoA(string $correo): string
    {
        return Mail::sent(CodigoMail::class, fn (CodigoMail $m) => $m->hasTo($correo))->last()->codigo;
    }

    private function verificarAlternativoDeAna(string $correo = 'ana.respaldo@outlook.com'): void
    {
        $this->ana->forceFill(['correo_alternativo' => $correo, 'correo_alternativo_verificado_en' => now()])->save();
    }

    // ---- Forma 2: código al correo principal ----

    public function test_codigo_correcto_cambia_la_contrasena_y_deja_ingresado(): void
    {
        $this->ana->createToken('celular');
        config(['session.driver' => 'database']);
        DB::table('sessions')->insert(['id' => 'otra', 'user_id' => $this->ana->id, 'payload' => '', 'last_activity' => time()]);

        $this->pedir('ANA@ejemplo.com')->assertOk()->assertJsonPath('mensaje', self::MENSAJE_CORREO);
        $codigo = $this->codigoEnviadoA('ana@ejemplo.com');
        $this->assertMatchesRegularExpression('/^\d{6}$/', $codigo);

        $this->cambiar($codigo)->assertOk()->assertJsonPath('data.email', 'ana@ejemplo.com');

        $this->assertTrue(Hash::check('nueva12345', $this->ana->fresh()->password));
        $this->assertSame(0, $this->ana->tokens()->count());
        $this->assertSame(0, DB::table('sessions')->where('id', 'otra')->count());
        $this->assertDatabaseHas('eventos', ['tipo' => 'cuenta.contrasena', 'entidad_id' => $this->ana->id, 'mensaje' => 'Contraseña cambiada con código por correo.']);
        $this->getJson('/api/v1/auth/yo')->assertOk();
    }

    public function test_el_codigo_se_guarda_con_hash_y_el_correo_es_en_espanol(): void
    {
        $this->pedir('ana@ejemplo.com');
        $codigo = $this->codigoEnviadoA('ana@ejemplo.com');
        $guardado = CodigoVerificacion::firstOrFail();

        $this->assertNotSame($codigo, $guardado->codigo_hash);
        $this->assertStringNotContainsString($codigo, json_encode(DB::table('codigos_verificacion')->get()));
        $this->assertTrue(Hash::check($codigo, $guardado->codigo_hash));

        $correo = Mail::sent(CodigoMail::class)->first();
        $correo->assertHasSubject('Tu código de LUMICLASS');
        $correo->assertSeeInHtml($codigo);
        $correo->assertSeeInHtml('Hola, Ana');
        $correo->assertSeeInHtml('10 minutos');
    }

    public function test_codigo_incorrecto_no_cambia_nada(): void
    {
        $this->pedir('ana@ejemplo.com');
        $correcto = $this->codigoEnviadoA('ana@ejemplo.com');
        $malo = $correcto === '000000' ? '111111' : '000000';

        $this->cambiar($malo)->assertStatus(400)
            ->assertJsonPath('error.codigo', 'codigo_invalido')
            ->assertJsonPath('error.mensaje', 'El código no es válido o ya venció. Pide uno nuevo.');
        $this->assertTrue(Hash::check('vieja1234', $this->ana->fresh()->password));
    }

    public function test_codigo_vencido_a_los_10_minutos(): void
    {
        $this->pedir('ana@ejemplo.com');
        $codigo = $this->codigoEnviadoA('ana@ejemplo.com');
        $this->travel(11)->minutes();

        $this->cambiar($codigo)->assertStatus(400)->assertJsonPath('error.codigo', 'codigo_invalido');
    }

    public function test_codigo_reutilizado_no_sirve(): void
    {
        $this->pedir('ana@ejemplo.com');
        $codigo = $this->codigoEnviadoA('ana@ejemplo.com');

        $this->cambiar($codigo)->assertOk();
        $this->cambiar($codigo)->assertStatus(400)->assertJsonPath('error.codigo', 'codigo_invalido');
    }

    public function test_pedir_uno_nuevo_anula_el_anterior(): void
    {
        $this->pedir('ana@ejemplo.com');
        $primero = $this->codigoEnviadoA('ana@ejemplo.com');
        $this->pedir('ana@ejemplo.com');
        $segundo = $this->codigoEnviadoA('ana@ejemplo.com');

        if ($primero !== $segundo) {
            $this->cambiar($primero)->assertStatus(400);
        }
        $this->cambiar($segundo)->assertOk();
        $this->assertSame(0, CodigoVerificacion::count());
    }

    public function test_limite_de_5_intentos_fallidos_y_espera_de_15_minutos(): void
    {
        $this->pedir('ana@ejemplo.com');
        $correcto = $this->codigoEnviadoA('ana@ejemplo.com');
        $malo = $correcto === '000000' ? '111111' : '000000';

        // Un minuto entre intentos: así se mide el bloqueo por códigos y no el límite general de 5 peticiones por minuto.
        foreach (range(1, 5) as $_) {
            $this->travel(61)->seconds();
            $this->cambiar($malo)->assertStatus(400);
        }
        // Bloqueado: ni siquiera el código correcto sirve.
        $this->travel(61)->seconds();
        $this->cambiar($correcto)->assertStatus(429)->assertJsonPath('error.codigo', 'demasiados_intentos_codigo');

        $this->travel(16)->minutes();
        $this->pedir('ana@ejemplo.com');
        $this->cambiar($this->codigoEnviadoA('ana@ejemplo.com'))->assertOk();
    }

    public function test_maximo_3_envios_por_hora_sin_delatarlo(): void
    {
        foreach (range(1, 4) as $_) {
            $this->pedir('ana@ejemplo.com')->assertOk()->assertJsonPath('mensaje', self::MENSAJE_CORREO);
        }
        Mail::assertSentCount(3);

        $this->travel(61)->minutes();
        $this->pedir('ana@ejemplo.com');
        Mail::assertSentCount(4);
    }

    public function test_correo_inexistente_misma_respuesta_y_nada_se_envia(): void
    {
        $existe = $this->pedir('ana@ejemplo.com')->json();
        $noExiste = $this->pedir('nadie@ejemplo.com')->assertOk()->json();

        $this->assertSame($existe, $noExiste);
        Mail::assertSentCount(1);
        $this->cambiar('123456', 'correo', 'nadie@ejemplo.com')->assertStatus(400)->assertJsonPath('error.codigo', 'codigo_invalido');
    }

    public function test_el_bloqueo_tambien_aplica_a_correos_que_no_existen(): void
    {
        // Si solo se bloquearan las cuentas reales, un atacante sabría cuáles existen.
        foreach (range(1, 5) as $_) {
            $this->travel(61)->seconds();
            $this->cambiar('123456', 'correo', 'nadie@ejemplo.com')->assertStatus(400);
        }
        $this->travel(61)->seconds();
        $this->cambiar('123456', 'correo', 'nadie@ejemplo.com')
            ->assertStatus(429)->assertJsonPath('error.codigo', 'demasiados_intentos_codigo');
    }

    public function test_si_el_correo_no_sale_responde_igual(): void
    {
        Mail::shouldReceive('to')->andThrow(new \RuntimeException('SMTP no responde'));

        $this->pedir('ana@ejemplo.com')->assertOk()->assertJsonPath('mensaje', self::MENSAJE_CORREO);
    }

    public function test_datos_invalidos(): void
    {
        $this->pedir('ana@ejemplo.com', 'sms')->assertStatus(400)->assertJsonValidationErrors(['via'], 'error.detalles');
        $this->postJson('/api/v1/auth/codigo/restablecer', ['email' => 'ana@ejemplo.com', 'via' => 'correo', 'codigo' => '12a', 'password' => 'x', 'password_confirmation' => 'y'])
            ->assertStatus(400)
            ->assertJsonPath('error.detalles.codigo.0', 'El campo código debe tener 6 dígitos.')
            ->assertJsonValidationErrors(['password'], 'error.detalles');
    }

    public function test_acepta_el_codigo_pegado_con_espacios(): void
    {
        $this->pedir('ana@ejemplo.com');
        $codigo = $this->codigoEnviadoA('ana@ejemplo.com');

        $this->cambiar(substr($codigo, 0, 3).' '.substr($codigo, 3))->assertOk();
    }

    // ---- Forma 3: código al correo alternativo ----

    public function test_con_alternativo_verificado_el_codigo_llega_a_ese_correo(): void
    {
        $this->verificarAlternativoDeAna();

        $this->pedir('ana@ejemplo.com', 'alternativo')->assertOk()->assertJsonPath('mensaje', self::MENSAJE_ALTERNATIVO);

        Mail::assertSent(CodigoMail::class, fn (CodigoMail $m) => $m->hasTo('ana.respaldo@outlook.com'));
        Mail::assertNotSent(CodigoMail::class, fn (CodigoMail $m) => $m->hasTo('ana@ejemplo.com'));

        $this->cambiar($this->codigoEnviadoA('ana.respaldo@outlook.com'), 'alternativo')->assertOk();
        $this->assertDatabaseHas('eventos', ['tipo' => 'cuenta.contrasena', 'mensaje' => 'Contraseña cambiada con código al correo alternativo.']);
    }

    public function test_alternativo_sin_verificar_no_recibe_nada_y_no_se_delata(): void
    {
        $this->ana->forceFill(['correo_alternativo_pendiente' => 'ana.respaldo@outlook.com'])->save();

        $this->pedir('ana@ejemplo.com', 'alternativo')->assertOk()->assertJsonPath('mensaje', self::MENSAJE_ALTERNATIVO);
        $this->pedir('nadie@ejemplo.com', 'alternativo')->assertOk()->assertJsonPath('mensaje', self::MENSAJE_ALTERNATIVO);

        Mail::assertNothingSent();
    }

    public function test_un_codigo_de_una_forma_no_sirve_para_la_otra(): void
    {
        $this->verificarAlternativoDeAna();
        $this->pedir('ana@ejemplo.com', 'correo');

        $this->cambiar($this->codigoEnviadoA('ana@ejemplo.com'), 'alternativo')->assertStatus(400);
    }

    public function test_la_forma_1_enlace_sigue_igual_y_ahora_queda_en_el_historial(): void
    {
        $token = Password::broker()->createToken($this->ana);

        $this->withHeader('Referer', config('app.url'))->postJson('/api/v1/auth/restablecer', [
            'token' => $token, 'email' => 'ana@ejemplo.com', 'password' => 'nueva12345', 'password_confirmation' => 'nueva12345',
        ])->assertOk()->assertJsonPath('mensaje', 'Listo: tu contraseña se cambió y ya ingresaste con la nueva.');

        $this->assertDatabaseHas('eventos', ['tipo' => 'cuenta.contrasena', 'mensaje' => 'Contraseña cambiada con enlace por correo.']);
    }

    public function test_paginas(): void
    {
        $this->get('/olvide')->assertOk()
            ->assertSee('1. Enlace por correo')->assertSee('2. Código de 6 dígitos por correo')->assertSee('3. Usar mi correo alternativo')
            ->assertSee('Enviar enlace');
        $this->get('/recuperar/codigo?via=correo')->assertOk()->assertSee('Enviar código')->assertSee('inputmode="numeric"', false);
        $this->get('/recuperar/codigo?via=alternativo')->assertOk()->assertSee('correo alternativo verificado');
        $this->get('/recuperar/codigo?via=<script>')->assertOk()->assertDontSee('<script>', false);
    }
}

<?php

namespace Tests\Feature\Api;

use App\Mail\CodigoMail;
use App\Models\Evento;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/** "Seguridad de mi cuenta": correo alternativo para la forma 3 de recuperar la contraseña. */
class CorreoAlternativoTest extends TestCase
{
    use RefreshDatabase;

    private User $ana;

    protected function setUp(): void
    {
        parent::setUp();

        Mail::fake();
        $this->ana = User::factory()->create(['name' => 'Ana', 'email' => 'ana@ejemplo.com', 'password' => 'clave1234']);
        $this->iniciarSesion($this->ana);
    }

    private function guardar(string $correo, string $password = 'clave1234')
    {
        return $this->postJson('/api/v1/cuenta/alternativo', ['correo_alternativo' => $correo, 'password_actual' => $password]);
    }

    private function codigoEnviadoA(string $correo): string
    {
        return Mail::sent(CodigoMail::class, fn (CodigoMail $m) => $m->hasTo($correo))->last()->codigo;
    }

    public function test_sin_verificar_hasta_confirmar_el_codigo(): void
    {
        $this->guardar('Marco.Respaldo@Outlook.com')
            ->assertOk()
            ->assertJsonPath('data.alternativo', null)
            ->assertJsonPath('data.pendiente', 'ma***@outlook.com');

        Mail::assertSent(CodigoMail::class, fn (CodigoMail $m) => $m->hasTo('marco.respaldo@outlook.com'));
        $this->assertFalse($this->ana->fresh()->tieneAlternativoVerificado());

        $this->postJson('/api/v1/cuenta/alternativo/verificar', ['codigo' => $this->codigoEnviadoA('marco.respaldo@outlook.com')])
            ->assertOk()
            ->assertJsonPath('data.alternativo.enmascarado', 'ma***@outlook.com')
            ->assertJsonPath('data.alternativo.verificado', true)
            ->assertJsonPath('data.pendiente', null);

        $this->assertTrue($this->ana->fresh()->tieneAlternativoVerificado());
        $this->assertSame('marco.respaldo@outlook.com', $this->ana->fresh()->correo_alternativo);
        // Quedó en el historial: se pidió y se verificó.
        $this->assertSame(2, Evento::where('tipo', 'cuenta.alternativo')->where('entidad_id', $this->ana->id)->count());
    }

    public function test_pide_la_contrasena_actual(): void
    {
        $this->guardar('respaldo@ejemplo.com', 'equivocada')
            ->assertStatus(400)
            ->assertJsonPath('error.detalles.password_actual.0', 'La contraseña actual no es correcta.');
        Mail::assertNothingSent();
    }

    public function test_no_puede_ser_igual_al_principal(): void
    {
        $this->guardar('ANA@ejemplo.com')
            ->assertStatus(400)
            ->assertJsonPath('error.detalles.correo_alternativo.0', 'El correo alternativo debe ser distinto de tu correo principal.');
    }

    public function test_no_puede_estar_usado_en_otra_cuenta(): void
    {
        User::factory()->create(['email' => 'beto@ejemplo.com', 'correo_alternativo' => 'beto.respaldo@ejemplo.com', 'correo_alternativo_verificado_en' => now()]);

        foreach (['beto@ejemplo.com', 'beto.respaldo@ejemplo.com'] as $ajeno) {
            $this->guardar($ajeno)
                ->assertStatus(400)
                ->assertJsonPath('error.detalles.correo_alternativo.0', 'Ese correo ya está en uso en otra cuenta.');
        }
        Mail::assertNothingSent();
    }

    public function test_si_otra_cuenta_lo_toma_mientras_se_verifica_no_se_activa(): void
    {
        $this->guardar('compartido@ejemplo.com')->assertOk();
        User::factory()->create(['email' => 'compartido@ejemplo.com']);

        $this->postJson('/api/v1/cuenta/alternativo/verificar', ['codigo' => $this->codigoEnviadoA('compartido@ejemplo.com')])
            ->assertStatus(409)->assertJsonPath('error.codigo', 'correo_en_uso');
        $this->assertNull($this->ana->fresh()->correo_alternativo);
    }

    public function test_codigo_de_verificacion_incorrecto_y_limite_de_intentos(): void
    {
        $this->guardar('respaldo@ejemplo.com');
        $correcto = $this->codigoEnviadoA('respaldo@ejemplo.com');
        $malo = $correcto === '000000' ? '111111' : '000000';

        foreach (range(1, 5) as $_) {
            $this->postJson('/api/v1/cuenta/alternativo/verificar', ['codigo' => $malo])->assertStatus(400);
        }
        $this->postJson('/api/v1/cuenta/alternativo/verificar', ['codigo' => $correcto])->assertStatus(429);
        $this->assertFalse($this->ana->fresh()->tieneAlternativoVerificado());
    }

    public function test_codigo_de_verificacion_vencido(): void
    {
        $this->guardar('respaldo@ejemplo.com');
        $codigo = $this->codigoEnviadoA('respaldo@ejemplo.com');
        $this->travel(11)->minutes();

        $this->postJson('/api/v1/cuenta/alternativo/verificar', ['codigo' => $codigo])->assertStatus(400);
    }

    public function test_reenviar_y_limite_de_3_envios_por_hora(): void
    {
        $this->guardar('respaldo@ejemplo.com')->assertOk();
        $this->postJson('/api/v1/cuenta/alternativo/reenviar')->assertOk();
        $this->postJson('/api/v1/cuenta/alternativo/reenviar')->assertOk();
        $this->postJson('/api/v1/cuenta/alternativo/reenviar')
            ->assertStatus(429)->assertJsonPath('error.codigo', 'limite_codigos');

        Mail::assertSentCount(3);
    }

    public function test_cambiar_mantiene_el_anterior_activo_hasta_verificar_el_nuevo(): void
    {
        $this->ana->forceFill(['correo_alternativo' => 'viejo@ejemplo.com', 'correo_alternativo_verificado_en' => now()])->save();

        $this->guardar('nuevo@ejemplo.com')->assertOk()
            ->assertJsonPath('data.alternativo.enmascarado', 'vi***@ejemplo.com')
            ->assertJsonPath('data.pendiente', 'nu***@ejemplo.com');
        $this->assertSame('viejo@ejemplo.com', $this->ana->fresh()->correo_alternativo);

        $this->postJson('/api/v1/cuenta/alternativo/verificar', ['codigo' => $this->codigoEnviadoA('nuevo@ejemplo.com')])->assertOk();
        $this->assertSame('nuevo@ejemplo.com', $this->ana->fresh()->correo_alternativo);
    }

    public function test_quitar_pide_la_contrasena(): void
    {
        $this->ana->forceFill(['correo_alternativo' => 'respaldo@ejemplo.com', 'correo_alternativo_verificado_en' => now()])->save();

        $this->deleteJson('/api/v1/cuenta/alternativo', ['password_actual' => 'mala'])->assertStatus(400);
        $this->deleteJson('/api/v1/cuenta/alternativo', ['password_actual' => 'clave1234'])->assertOk()->assertJsonPath('data.alternativo', null);

        $this->assertNull($this->ana->fresh()->correo_alternativo);
        $this->assertDatabaseHas('eventos', ['tipo' => 'cuenta.alternativo', 'mensaje' => 'Correo alternativo quitado.']);
    }

    public function test_actividad_de_la_cuenta(): void
    {
        $this->guardar('respaldo@ejemplo.com');

        $this->getJson('/api/v1/cuenta/seguridad')->assertOk()
            ->assertJsonPath('data.email', 'ana@ejemplo.com')
            ->assertJsonPath('data.actividad.0.mensaje', 'Se pidió verificar el correo alternativo re***@ejemplo.com.');
    }

    public function test_enmascarado(): void
    {
        $this->assertSame('ma***@outlook.com', User::enmascarar('marco@outlook.com'));
        $this->assertSame('a***@x.co', User::enmascarar('ab@x.co'));
        $this->assertNull(User::enmascarar(null));
    }

    // ---- Registro y aviso ----

    public function test_registro_con_correo_alternativo_queda_sin_verificar(): void
    {
        $this->app['auth']->forgetGuards();

        $this->withHeader('Referer', config('app.url'))->postJson('/api/v1/auth/registro', [
            'nombre' => 'Sofía', 'email' => 'sofia@ejemplo.com', 'password' => 'secreta123', 'password_confirmation' => 'secreta123',
            'correo_alternativo' => 'sofia.respaldo@ejemplo.com',
        ])->assertCreated()->assertJsonPath('verificar_alternativo', true);

        $sofia = User::where('email', 'sofia@ejemplo.com')->firstOrFail();
        $this->assertSame('sofia.respaldo@ejemplo.com', $sofia->correo_alternativo_pendiente);
        $this->assertFalse($sofia->tieneAlternativoVerificado());
        Mail::assertSent(CodigoMail::class, fn (CodigoMail $m) => $m->hasTo('sofia.respaldo@ejemplo.com'));
    }

    public function test_registro_valida_el_correo_alternativo(): void
    {
        $this->app['auth']->forgetGuards();
        $registro = fn (array $cambios) => $this->withHeader('Referer', config('app.url'))->postJson('/api/v1/auth/registro', array_replace([
            'nombre' => 'Sofía', 'email' => 'sofia@ejemplo.com', 'password' => 'secreta123', 'password_confirmation' => 'secreta123',
        ], $cambios));

        $registro(['correo_alternativo' => 'sofia@ejemplo.com'])->assertStatus(400)
            ->assertJsonPath('error.detalles.correo_alternativo.0', 'El correo alternativo debe ser distinto de tu correo principal.');
        $registro(['correo_alternativo' => 'ana@ejemplo.com'])->assertStatus(400)
            ->assertJsonPath('error.detalles.correo_alternativo.0', 'Ese correo ya está en uso en otra cuenta.');

        // Ni como principal se puede usar el alternativo de otra cuenta.
        $this->ana->forceFill(['correo_alternativo' => 'respaldo@ejemplo.com', 'correo_alternativo_verificado_en' => now()])->save();
        $registro(['email' => 'respaldo@ejemplo.com'])->assertStatus(400)->assertJsonValidationErrors(['email'], 'error.detalles');

        // Sin correo alternativo también funciona (es opcional).
        $registro([])->assertCreated()->assertJsonPath('verificar_alternativo', false);
    }

    public function test_aviso_discreto_solo_sin_alternativo_verificado(): void
    {
        $this->actingAs($this->ana);
        $this->get('/salones')->assertOk()->assertSee('Agrega un correo alternativo')->assertSee('Seguridad de mi cuenta');
        $this->get('/cuenta/seguridad')->assertOk()->assertDontSee('Agrega un correo alternativo');

        $this->ana->forceFill(['correo_alternativo' => 'respaldo@ejemplo.com', 'correo_alternativo_verificado_en' => now()])->save();
        $this->get('/salones')->assertOk()->assertDontSee('Agrega un correo alternativo');
    }
}

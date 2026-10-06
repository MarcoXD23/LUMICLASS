<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    /** El navegador envía Referer de su propio dominio: así Sanctum usa la sesión (cookie). */
    private function desdeElNavegador(): static
    {
        return $this->withHeader('Referer', config('app.url'));
    }

    private function registrar(array $cambios = [])
    {
        return $this->desdeElNavegador()->postJson('/api/v1/auth/registro', array_replace([
            'nombre' => 'Ana Pérez',
            'email' => 'ana@ejemplo.com',
            'password' => 'secreta123',
            'password_confirmation' => 'secreta123',
        ], $cambios));
    }

    public function test_registro_crea_la_cuenta_con_su_salon_de_ejemplo_e_inicia_sesion(): void
    {
        $salonId = $this->registrar()
            ->assertCreated()
            ->assertJsonPath('data.nombre', 'Ana Pérez')
            ->assertJsonPath('data.email', 'ana@ejemplo.com')
            ->assertJsonMissingPath('data.password')
            ->json('salon_id');

        $this->getJson('/api/v1/auth/yo')->assertOk()->assertJsonPath('data.email', 'ana@ejemplo.com');
        $this->getJson("/api/v1/salones/{$salonId}/estado")->assertOk()->assertJsonPath('data.luces.total', 4);
    }

    public function test_registro_rechaza_correo_repetido_aunque_cambien_mayusculas(): void
    {
        $this->registrar()->assertCreated();
        $this->app['auth']->forgetGuards();

        $this->registrar(['email' => 'ANA@Ejemplo.com'])
            ->assertStatus(400)
            ->assertJsonValidationErrors(['email'], 'error.detalles');
        $this->assertSame(1, User::count());
    }

    public function test_registro_valida_la_contrasena(): void
    {
        $this->registrar(['password' => 'corta', 'password_confirmation' => 'corta'])
            ->assertStatus(400)
            ->assertJsonValidationErrors(['password'], 'error.detalles');

        $this->registrar(['password_confirmation' => 'otra-distinta'])
            ->assertStatus(400)
            ->assertJsonValidationErrors(['password'], 'error.detalles');
    }

    public function test_login_y_logout_con_sesion(): void
    {
        User::factory()->create(['email' => 'ana@ejemplo.com', 'password' => 'secreta123']);

        $this->desdeElNavegador()->postJson('/api/v1/auth/login', ['email' => 'Ana@Ejemplo.com', 'password' => 'secreta123'])
            ->assertOk()
            ->assertJsonPath('data.email', 'ana@ejemplo.com');
        $this->getJson('/api/v1/salones')->assertOk();

        $this->desdeElNavegador()->postJson('/api/v1/auth/logout')->assertNoContent();
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/v1/salones')->assertUnauthorized();
    }

    public function test_login_con_datos_incorrectos_no_revela_si_el_correo_existe(): void
    {
        User::factory()->create(['email' => 'ana@ejemplo.com', 'password' => 'secreta123']);

        $malaClave = $this->desdeElNavegador()->postJson('/api/v1/auth/login', ['email' => 'ana@ejemplo.com', 'password' => 'otra']);
        $noExiste = $this->desdeElNavegador()->postJson('/api/v1/auth/login', ['email' => 'nadie@ejemplo.com', 'password' => 'otra']);

        $malaClave->assertUnauthorized()->assertJsonPath('error.codigo', 'credenciales_invalidas');
        $this->assertSame($malaClave->json(), $noExiste->json());
    }

    public function test_login_sin_navegador_indica_usar_token(): void
    {
        $this->postJson('/api/v1/auth/login', ['email' => 'ana@ejemplo.com', 'password' => 'secreta123'])
            ->assertStatus(400)
            ->assertJsonPath('error.codigo', 'sesion_no_disponible');
    }

    public function test_token_para_scripts_y_su_revocacion(): void
    {
        User::factory()->create(['email' => 'ana@ejemplo.com', 'password' => 'secreta123']);

        $token = $this->postJson('/api/v1/auth/token', ['email' => 'ana@ejemplo.com', 'password' => 'secreta123', 'nombre_dispositivo' => 'PowerShell'])
            ->assertCreated()
            ->json('token');

        $this->withToken($token)->getJson('/api/v1/auth/yo')->assertOk()->assertJsonPath('data.email', 'ana@ejemplo.com');
        $this->withToken($token)->postJson('/api/v1/auth/logout')->assertNoContent();

        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/v1/auth/yo')->assertUnauthorized();
    }

    public function test_sin_sesion_responde_401_en_espanol(): void
    {
        $this->getJson('/api/v1/salones')
            ->assertUnauthorized()
            ->assertJsonPath('error.codigo', 'no_autenticado')
            ->assertJsonPath('error.mensaje', 'Inicia sesión para continuar.');
    }

    public function test_demasiados_intentos_de_login_responden_429(): void
    {
        foreach (range(1, 5) as $_) {
            $this->postJson('/api/v1/auth/token', ['email' => 'ana@ejemplo.com', 'password' => 'mala'])->assertUnauthorized();
        }

        $this->postJson('/api/v1/auth/token', ['email' => 'ana@ejemplo.com', 'password' => 'mala'])
            ->assertStatus(429)
            ->assertJsonPath('error.codigo', 'demasiados_intentos')
            ->assertHeader('Retry-After');
    }
}

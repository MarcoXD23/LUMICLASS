<?php

namespace Tests\Feature\Web;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ArreglosLoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_con_mayusculas_y_espacios_entra_a_la_cuenta_en_minusculas(): void
    {
        User::factory()->create(['email' => 'ana@correo.com', 'password' => 'secreta123']);

        $this->withHeader('Referer', config('app.url'))
            ->postJson('/api/v1/auth/login', ['email' => ' Ana@Correo.com ', 'password' => 'secreta123'])
            ->assertOk()
            ->assertJsonPath('data.email', 'ana@correo.com');
    }

    public function test_token_con_mayusculas_y_espacios_tambien_funciona(): void
    {
        User::factory()->create(['email' => 'ana@correo.com', 'password' => 'secreta123']);

        $this->postJson('/api/v1/auth/token', ['email' => ' Ana@Correo.com ', 'password' => 'secreta123'])
            ->assertCreated();
    }

    public function test_el_boton_de_ojo_sale_en_todas_las_pantallas_con_contrasena(): void
    {
        $sinSesion = ['/ingresar', '/registro', '/restablecer/token-de-prueba?email=ana@correo.com', '/recuperar/codigo?via=correo'];
        foreach ($sinSesion as $pagina) {
            $this->get($pagina)->assertOk()
                ->assertSee('aria-label="Mostrar contraseña"', false)
                ->assertSee('aria-pressed="false"', false)
                ->assertSee('class="btn-ojo"', false);
        }

        $this->actingAs(User::factory()->create());
        $this->get('/cuenta/seguridad')->assertOk()->assertSee('aria-label="Mostrar contraseña"', false);
    }

    public function test_los_campos_que_no_son_contrasena_no_llevan_ojo(): void
    {
        $this->get('/olvide')->assertOk()->assertDontSee('btn-ojo', false);
    }
}

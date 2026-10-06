<?php

namespace Tests\Feature\Api;

use App\Models\Salon;
use App\Models\User;
use App\Servicios\CreadorSalon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class SeguridadTest extends TestCase
{
    use RefreshDatabase;

    public function test_un_nombre_con_codigo_se_muestra_como_texto_y_no_se_ejecuta(): void
    {
        $usuario = $this->iniciarSesion();
        $this->actingAs($usuario);
        $id = $this->postJson('/api/v1/salones', ['nombre' => '<script>alert("x")</script>'])->assertCreated()->json('data.id');

        $this->get("/salones/{$id}")
            ->assertOk()
            ->assertDontSee('<script>alert("x")</script>', false)
            ->assertSee('&lt;script&gt;', false);
    }

    public function test_las_vistas_nunca_insertan_html_sin_escapar(): void
    {
        // {!! !!} en Blade y x-html en Alpine insertan HTML tal cual: con datos de usuario serían una puerta a XSS.
        $peligrosos = collect(File::allFiles(resource_path('views')))
            ->filter(fn ($archivo) => preg_match('/\{!!|x-html/', $archivo->getContents()))
            ->map(fn ($archivo) => $archivo->getRelativePathname())
            ->values()
            ->all();

        $this->assertSame([], $peligrosos);
    }

    public function test_no_se_puede_asignar_un_salon_a_otra_cuenta_enviando_campos_extra(): void
    {
        $otra = User::factory()->create();
        $yo = $this->iniciarSesion();

        $id = $this->postJson('/api/v1/salones', ['nombre' => 'Mío', 'user_id' => $otra->id])->assertCreated()->json('data.id');
        $this->patchJson("/api/v1/salones/{$id}", ['nombre' => 'Sigue siendo mío', 'user_id' => $otra->id])->assertOk();

        $this->assertSame($yo->id, Salon::find($id)->user_id);
        $this->assertSame(0, $otra->salones()->count());
    }

    public function test_una_regla_no_se_puede_colar_en_el_salon_de_otra_cuenta(): void
    {
        $ajeno = app(CreadorSalon::class)->crearEjemplo(User::factory()->create());
        $mio = app(CreadorSalon::class)->crearEjemplo($this->iniciarSesion());

        $this->postJson("/api/v1/salones/{$mio->id}/reglas", [
            'nombre' => 'Intrusa', 'activa' => true, 'prioridad' => 1, 'salon_id' => $ajeno->id,
            'condicion' => ['presencia' => 'ocupado'], 'accion' => ['accion' => 'apagar'],
        ])->assertCreated();

        $this->assertSame(0, $ajeno->reglas()->where('nombre', 'Intrusa')->count());
        $this->assertSame(1, $mio->reglas()->where('nombre', 'Intrusa')->count());
    }

    public function test_las_contrasenas_se_guardan_cifradas_y_nunca_se_devuelven(): void
    {
        $this->withHeader('Referer', config('app.url'))->postJson('/api/v1/auth/registro', [
            'nombre' => 'Ana', 'email' => 'ana@ejemplo.com', 'password' => 'secreta123', 'password_confirmation' => 'secreta123',
        ])->assertCreated()->assertJsonMissingPath('data.password');

        $guardada = DB::table('users')->where('email', 'ana@ejemplo.com')->value('password');
        $this->assertNotSame('secreta123', $guardada);
        $this->assertStringStartsWith('$2y$', $guardada);

        $this->getJson('/api/v1/auth/yo')->assertJsonMissingPath('data.password')->assertJsonMissingPath('data.remember_token');
    }

    public function test_cookie_de_sesion_propia_y_no_accesible_desde_javascript(): void
    {
        $this->assertSame('lumiclass_session', config('session.cookie'));
        $this->assertTrue(config('session.http_only'));

        $cookie = collect($this->get('/ingresar')->headers->getCookies())->firstWhere(fn ($c) => $c->getName() === 'lumiclass_session');
        $this->assertNotNull($cookie);
        $this->assertTrue($cookie->isHttpOnly());
    }

    public function test_un_token_revocado_o_inventado_no_sirve(): void
    {
        $this->withToken('1|inventado')->getJson('/api/v1/salones')->assertUnauthorized();
    }
}

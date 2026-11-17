<?php

namespace Tests\Feature\Api;

use App\Enums\EstadoLuz;
use App\Models\Luz;
use App\Models\User;
use App\Models\Zona;
use App\Servicios\ServicioTick;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

/** ESP32 "por internet" (para el hosting): la placa llama al servidor con su clave y recoge las órdenes. */
class Esp32InternetTest extends TestCase
{
    use RefreshDatabase;

    private Luz $luz;

    private User $usuario;

    protected function setUp(): void
    {
        parent::setUp();

        $this->usuario = $this->iniciarSesion();
        $this->luz = Luz::factory()->for(Zona::factory()->manual())->create(['estado_real' => EstadoLuz::Apagada]);
        $this->luz->zona->salon->update(['user_id' => $this->usuario->id]);
        Http::fake(fn () => $this->fail('En modo por internet el servidor nunca llama al ESP32.'));
    }

    private function generarClave(): string
    {
        return $this->postJson("/api/v1/actuadores/{$this->luz->actuador_id}/esp32/clave")
            ->assertOk()
            ->assertJsonPath('data.conexion_esp32', 'internet')
            ->assertJsonPath('data.conexion', 'inactivo')
            ->json('conexion.clave');
    }

    /** El ESP32 no tiene sesión: solo su clave. Después se vuelve a la sesión del usuario. */
    private function latido(string $clave, bool $on)
    {
        $this->app['auth']->forgetGuards();
        $respuesta = $this->withToken($clave)->postJson('/api/v1/dispositivo/latido', ['on' => $on]);
        $this->flushHeaders();
        $this->iniciarSesion($this->usuario);

        return $respuesta;
    }

    private function encender()
    {
        return $this->postJson("/api/v1/luces/{$this->luz->id}/comando", ['accion' => 'encender', 'id_solicitud' => (string) Str::uuid()]);
    }

    public function test_la_clave_se_muestra_una_vez_y_solo_se_guarda_su_hash(): void
    {
        $clave = $this->generarClave();

        $this->assertSame(40, strlen($clave));
        $this->assertSame(hash('sha256', $clave), $this->luz->actuador->fresh()->clave_hash);
        $this->getJson("/api/v1/salones/{$this->luz->zona->salon_id}/luces")->assertDontSee($clave)->assertDontSee('clave_hash');
    }

    public function test_el_latido_conecta_y_actualiza_el_estado_de_la_luz(): void
    {
        $clave = $this->generarClave();

        $this->latido($clave, true)->assertOk()->assertExactJson(['orden' => null, 'intervalo' => 2]);

        $this->assertSame('activo', $this->luz->actuador->fresh()->conexion->value);
        $this->assertSame(EstadoLuz::Encendida, $this->luz->fresh()->estado_real);
    }

    public function test_la_orden_queda_pendiente_la_placa_la_recoge_y_la_confirma(): void
    {
        $clave = $this->generarClave();
        $this->latido($clave, false)->assertOk();

        $this->encender()->assertStatus(202)->assertJsonPath('resultado', 'pendiente');

        // La placa todavía no cambió el relé: recibe la orden.
        $this->latido($clave, false)->assertJsonPath('orden', 'on');
        $this->assertTrue($this->luz->actuador->fresh()->ocupado);

        // En el siguiente latido el relé ya está encendido: se confirma y no hay más órdenes.
        $this->travel(1)->seconds();
        $this->latido($clave, true)->assertJsonPath('orden', null);
        $this->assertSame(EstadoLuz::Encendida, $this->luz->fresh()->estado_real);
        $this->assertFalse($this->luz->actuador->fresh()->ocupado);
    }

    public function test_si_la_placa_no_recoge_la_orden_vence_y_la_luz_queda_desconocida(): void
    {
        $clave = $this->generarClave();
        $this->latido($clave, false)->assertOk();
        $this->encender()->assertStatus(202);

        $this->travel(11)->seconds();
        app(ServicioTick::class)->ejecutar();

        $this->assertSame(EstadoLuz::Desconocida, $this->luz->fresh()->estado_real);
    }

    public function test_sin_latidos_queda_inactivo_y_no_se_puede_accionar(): void
    {
        $clave = $this->generarClave();
        $this->latido($clave, false)->assertOk();

        $this->travel(16)->seconds();
        app(ServicioTick::class)->ejecutar();

        $this->assertSame('inactivo', $this->luz->actuador->fresh()->conexion->value);
        $this->encender()->assertStatus(409);
    }

    public function test_clave_invalida_o_reemplazada_se_rechaza(): void
    {
        $this->latido('inventada', true)->assertStatus(401)->assertJsonPath('error.codigo', 'clave_invalida');

        $vieja = $this->generarClave();
        $nueva = $this->generarClave();

        $this->latido($vieja, true)->assertStatus(401);
        $this->latido($nueva, true)->assertOk();
    }

    public function test_quitar_el_esp32_invalida_la_clave(): void
    {
        $clave = $this->generarClave();

        $this->deleteJson("/api/v1/actuadores/{$this->luz->actuador_id}/esp32")->assertOk()
            ->assertJsonPath('data.conexion_esp32', null)
            ->assertJsonPath('data.conexion', 'activo');
        $this->latido($clave, true)->assertStatus(401);
    }
}

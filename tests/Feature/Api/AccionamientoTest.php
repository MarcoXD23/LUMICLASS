<?php

namespace Tests\Feature\Api;

use App\Drivers\EscenarioSimulado;
use App\Enums\EstadoLuz;
use App\Enums\RespuestaSimulada;
use App\Models\Actuador;
use App\Models\Evento;
use App\Models\Luz;
use App\Models\Zona;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/** Cómo responde el servo simulado a una orden: ok, falla, lento y sin respuesta. */
class AccionamientoTest extends TestCase
{
    use RefreshDatabase;

    private Luz $luz;

    protected function setUp(): void
    {
        parent::setUp();

        $this->luz = Luz::factory()->for(Zona::factory()->manual())->create(['estado_real' => EstadoLuz::Apagada]);
    }

    private function servoResponde(RespuestaSimulada $respuesta): void
    {
        app(EscenarioSimulado::class)->definirRespuesta($this->luz->actuador, $respuesta);
    }

    private function encender()
    {
        return $this->postJson("/api/v1/luces/{$this->luz->id}/comando", ['accion' => 'encender', 'id_solicitud' => (string) Str::uuid()]);
    }

    private function tick(): void
    {
        $this->postJson('/api/v1/sim/tick')->assertOk();
    }

    public function test_falla_deja_la_luz_desconocida_con_error_y_alerta(): void
    {
        $this->servoResponde(RespuestaSimulada::Falla);

        $this->encender()->assertOk()->assertJsonPath('resultado', 'fallida')->assertJsonPath('data.estado_real', 'desconocida');

        $this->assertFalse($this->luz->actuador->fresh()->ocupado);
        $this->assertDatabaseHas('eventos', ['tipo' => 'actuador.falla', 'severidad' => 'error']);
        $this->getJson('/api/v1/salon/estado')->assertJsonPath('data.alertas.0.entidad_tipo', 'luz');
    }

    public function test_lento_queda_pendiente_bloquea_otra_orden_y_luego_confirma(): void
    {
        $this->servoResponde(RespuestaSimulada::Lento);

        $this->encender()->assertStatus(202)->assertJsonPath('resultado', 'pendiente')->assertJsonPath('data.estado_real', 'apagada');

        // Un servo, una orden.
        $this->encender()->assertStatus(409)->assertJsonPath('error.codigo', 'actuador_ocupado');

        $this->travel(2)->seconds();
        $this->tick();
        $this->assertSame(EstadoLuz::Apagada, $this->luz->fresh()->estado_real);

        $this->travel(4)->seconds();
        $this->tick();
        $this->assertSame(EstadoLuz::Encendida, $this->luz->fresh()->estado_real);
        $this->assertFalse($this->luz->actuador->fresh()->ocupado);
        $this->assertDatabaseHas('eventos', ['tipo' => 'luz.confirmada', 'entidad_id' => $this->luz->id]);
    }

    public function test_sin_respuesta_vence_por_tiempo_de_espera(): void
    {
        $this->servoResponde(RespuestaSimulada::SinRespuesta);

        $this->encender()->assertStatus(202);

        $this->travel(config('lumiclass.servo.segundos_espera_confirmacion') + 1)->seconds();
        $this->tick();

        $luz = $this->luz->fresh('actuador');
        $this->assertSame(EstadoLuz::Desconocida, $luz->estado_real);
        $this->assertFalse($luz->actuador->ocupado);
        $this->assertNull($luz->actuador->orden_pendiente);
        $this->assertSame(1, Evento::where('tipo', 'actuador.sin_respuesta')->where('severidad', 'error')->count());
    }

    public function test_tras_una_falla_el_usuario_puede_reintentar(): void
    {
        $this->servoResponde(RespuestaSimulada::Falla);
        $this->encender()->assertJsonPath('resultado', 'fallida');

        $this->servoResponde(RespuestaSimulada::Ok);
        $this->encender()->assertOk()->assertJsonPath('resultado', 'completada')->assertJsonPath('data.estado_real', 'encendida');

        $this->assertSame('ok', $this->luz->actuador->fresh()->ultimo_resultado);
    }

    public function test_el_dashboard_hace_avanzar_las_ordenes_pendientes(): void
    {
        $this->servoResponde(RespuestaSimulada::Lento);
        $this->encender()->assertStatus(202);

        $this->travel(10)->seconds();
        $this->getJson('/api/v1/salon/estado')->assertOk()->assertJsonPath('data.luces.encendidas', 1);
    }

    public function test_driver_real_aun_no_implementado_responde_fallida(): void
    {
        config(['lumiclass.driver' => 'real']);

        $this->encender()->assertOk()->assertJsonPath('resultado', 'fallida');
        $this->assertStringContainsString('Fase 8', Actuador::first()->ultimo_resultado);
    }
}

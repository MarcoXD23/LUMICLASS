<?php

namespace Tests\Feature\Api;

use App\Enums\EstadoConexion;
use App\Enums\EstadoLuz;
use App\Models\Actuador;
use App\Models\Luz;
use App\Models\Placa;
use App\Models\Salon;
use App\Models\Sensor;
use App\Servicios\ServicioTick;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/** API de la placa ESP32 (Fase 8) con LUMICLASS_DRIVER=real. */
class PlacaApiTest extends TestCase
{
    use RefreshDatabase;

    private Salon $salon;

    private string $clave;

    protected function setUp(): void
    {
        parent::setUp();

        config(['lumiclass.driver' => 'real']);
        $this->salon = $this->iniciarSesionDemo();
        $this->clave = $this->postJson("/api/v1/salones/{$this->salon->id}/placa/clave")->assertCreated()->json('data.clave');
    }

    private function placa(string $metodo, string $ruta, array $datos = [], ?string $clave = null): TestResponse
    {
        return $this->withToken($clave ?? $this->clave)->json($metodo, "/api/v1/placa/{$ruta}", $datos);
    }

    private function luz(int $servo): Luz
    {
        return Actuador::query()->where('salon_id', $this->salon->id)->where('numero_en_placa', $servo)->firstOrFail()->luz;
    }

    private function encender(Luz $luz): TestResponse
    {
        return $this->flushHeaders()->postJson("/api/v1/luces/{$luz->id}/comando", ['accion' => 'encender', 'id_solicitud' => (string) Str::uuid()]);
    }

    public function test_sin_clave_o_con_clave_incorrecta_responde_401(): void
    {
        $this->postJson('/api/v1/placa/heartbeat')->assertUnauthorized()->assertJsonPath('error.codigo', 'clave_invalida');
        $this->placa('POST', 'heartbeat', [], 'lc_inventada')->assertUnauthorized();
    }

    public function test_la_clave_se_guarda_con_hash_y_regenerarla_invalida_la_anterior(): void
    {
        $this->assertStringStartsWith('lc_', $this->clave);
        $this->assertDatabaseMissing('placas', ['clave_hash' => $this->clave]);
        $this->assertDatabaseHas('placas', ['clave_hash' => hash('sha256', $this->clave)]);

        $nueva = $this->postJson("/api/v1/salones/{$this->salon->id}/placa/clave")->assertCreated()->json('data.clave');

        $this->placa('POST', 'heartbeat')->assertUnauthorized();
        $this->placa('POST', 'heartbeat', [], $nueva)->assertOk();
        $this->assertSame(1, Placa::count());
    }

    public function test_con_driver_simulado_la_api_de_la_placa_no_existe(): void
    {
        config(['lumiclass.driver' => 'simulado']);

        $this->placa('POST', 'heartbeat')->assertNotFound()->assertJsonPath('error.codigo', 'driver_simulado');
    }

    public function test_heartbeat_marca_la_placa_en_linea_en_el_dashboard(): void
    {
        $this->getJson("/api/v1/salones/{$this->salon->id}/estado")->assertJsonPath('data.placa.en_linea', false);

        $this->placa('POST', 'heartbeat', ['version' => '1.0.0'])
            ->assertOk()
            ->assertJsonPath('salon', $this->salon->nombre)
            ->assertJsonPath('ordenes_ms', 1000);

        $this->getJson("/api/v1/salones/{$this->salon->id}/estado")
            ->assertJsonPath('data.placa.en_linea', true)
            ->assertJsonPath('data.placa.version_firmware', '1.0.0');
        $this->assertDatabaseHas('eventos', ['tipo' => 'placa.conexion', 'origen' => 'placa']);
    }

    public function test_lecturas_se_mapean_por_numero_de_sensor_y_activan_las_reglas(): void
    {
        $this->placa('POST', 'heartbeat')->assertOk();

        $this->placa('POST', 'lecturas', ['lecturas' => [
            ['sensor' => 1, 'presencia' => true],
            ['sensor' => 9, 'presencia' => true],
        ]])
            ->assertOk()
            ->assertJsonPath('aplicadas', 1)
            ->assertJsonPath('ignoradas.0.sensor', 9)
            // La regla "encender al detectar presencia" ordena las 2 luces de esa zona.
            ->assertJsonPath('ordenes_reglas', 2);

        $sensor = Sensor::query()->where('numero_en_placa', 1)->firstOrFail();
        $this->assertTrue($sensor->presencia);
        $this->assertDatabaseHas('eventos', ['tipo' => 'sensor.presencia', 'origen' => 'placa']);
        $this->assertCount(2, $this->placa('GET', 'ordenes')->assertOk()->json('ordenes'));
    }

    public function test_lecturas_invalidas_responden_422(): void
    {
        $this->placa('POST', 'lecturas', ['lecturas' => [['sensor' => 0, 'presencia' => 'tal vez']]])
            ->assertStatus(400);
        $this->placa('POST', 'lecturas', ['lecturas' => [['sensor' => 1, 'presencia' => true], ['sensor' => 1, 'presencia' => false]]])
            ->assertStatus(400);
    }

    public function test_flujo_completo_orden_y_confirmacion_ok(): void
    {
        $this->placa('POST', 'heartbeat')->assertOk();
        $luz = $this->luz(2);

        $this->encender($luz)->assertStatus(202)->assertJsonPath('resultado', 'pendiente');

        $orden = $this->placa('GET', 'ordenes')->assertOk()->json('ordenes.0');
        $this->assertSame(2, $orden['servo']);
        $this->assertSame('encender', $orden['accion']);

        $this->placa('POST', 'confirmar', ['codigo' => $orden['codigo'], 'resultado' => 'ok'])
            ->assertOk()->assertJsonPath('estado', 'aplicada');

        $this->assertSame(EstadoLuz::Encendida, $luz->fresh()->estado_real);
        $this->assertFalse($luz->actuador->fresh()->ocupado);
        $this->assertSame([], $this->placa('GET', 'ordenes')->json('ordenes'));

        // Repetida (la placa reintentó): se ignora sin error para que deje de reintentar.
        $this->placa('POST', 'confirmar', ['codigo' => $orden['codigo'], 'resultado' => 'ok'])
            ->assertOk()->assertJsonPath('estado', 'ignorada');
    }

    public function test_confirmacion_con_falla_deja_la_luz_desconocida(): void
    {
        $this->placa('POST', 'heartbeat')->assertOk();
        $luz = $this->luz(1);
        $this->encender($luz)->assertStatus(202);
        $codigo = $this->placa('GET', 'ordenes')->json('ordenes.0.codigo');

        $this->placa('POST', 'confirmar', ['codigo' => $codigo, 'resultado' => 'falla', 'mensaje' => 'servo 1 sin configurar'])
            ->assertOk()->assertJsonPath('estado', 'aplicada');

        $this->assertSame(EstadoLuz::Desconocida, $luz->fresh()->estado_real);
        $this->assertDatabaseHas('eventos', ['tipo' => 'actuador.falla', 'severidad' => 'error']);
        $this->assertStringContainsString('servo 1 sin configurar', $luz->actuador->fresh()->ultimo_resultado);
    }

    public function test_orden_sin_confirmar_vence_y_la_confirmacion_tardia_se_ignora(): void
    {
        $this->placa('POST', 'heartbeat')->assertOk();
        $luz = $this->luz(1);
        $this->encender($luz)->assertStatus(202);
        $codigo = $this->placa('GET', 'ordenes')->json('ordenes.0.codigo');

        $this->travel(11)->seconds();
        $this->placa('POST', 'heartbeat')->assertOk();
        app(ServicioTick::class)->ejecutar();

        $this->assertSame(EstadoLuz::Desconocida, $luz->fresh()->estado_real);
        $this->assertDatabaseHas('eventos', ['tipo' => 'actuador.sin_respuesta']);
        $this->placa('POST', 'confirmar', ['codigo' => $codigo, 'resultado' => 'ok'])->assertJsonPath('estado', 'ignorada');
        $this->assertSame(EstadoLuz::Desconocida, $luz->fresh()->estado_real);
    }

    public function test_sin_heartbeat_la_orden_falla_al_instante(): void
    {
        $this->encender($this->luz(1))->assertOk()->assertJsonPath('resultado', 'fallida');

        $this->assertStringContainsString('desconectada', Actuador::query()->where('numero_en_placa', 1)->first()->ultimo_resultado);
        $this->assertSame([], $this->placa('GET', 'ordenes')->json('ordenes'));
    }

    public function test_30_s_sin_heartbeat_deja_sensores_y_servos_inactivos_y_vuelven_al_reconectar(): void
    {
        $this->placa('POST', 'heartbeat')->assertOk();
        $this->travel(31)->seconds();

        $this->assertSame(1, app(ServicioTick::class)->ejecutar()['placas_desconectadas']);

        $this->assertSame(0, Sensor::query()->where('conexion', EstadoConexion::Activo)->count());
        $this->assertSame(0, Actuador::query()->where('conexion', EstadoConexion::Activo)->count());
        $this->getJson("/api/v1/salones/{$this->salon->id}/estado")
            ->assertJsonPath('data.placa.en_linea', false)
            ->assertJsonPath('data.ocupacion', 'desconocida');
        $this->assertDatabaseHas('eventos', ['tipo' => 'placa.conexion', 'severidad' => 'error']);

        $this->placa('POST', 'heartbeat')->assertOk();

        $this->assertSame(0, Sensor::query()->where('conexion', '!=', EstadoConexion::Activo)->count());
        $this->assertSame(0, Actuador::query()->where('conexion', '!=', EstadoConexion::Activo)->count());
    }

    public function test_un_sensor_en_falla_no_se_reactiva_con_el_heartbeat(): void
    {
        $this->placa('POST', 'heartbeat')->assertOk();
        Sensor::query()->where('numero_en_placa', 2)->update(['conexion' => 'falla']);
        $this->travel(31)->seconds();
        app(ServicioTick::class)->ejecutar();

        $this->placa('POST', 'heartbeat')->assertOk();

        $this->assertSame(EstadoConexion::Falla, Sensor::query()->where('numero_en_placa', 2)->first()->conexion);
        $this->placa('POST', 'lecturas', ['lecturas' => [['sensor' => 2, 'presencia' => true]]])
            ->assertOk()->assertJsonPath('aplicadas', 0)->assertJsonPath('ignoradas.0.sensor', 2);
    }

    public function test_una_placa_solo_ve_y_confirma_ordenes_de_su_salon(): void
    {
        $this->placa('POST', 'heartbeat')->assertOk();
        $this->encender($this->luz(1))->assertStatus(202);
        $codigo = $this->placa('GET', 'ordenes')->json('ordenes.0.codigo');

        // Otra cuenta con su salón y su placa.
        $this->iniciarSesion();
        $otroSalon = $this->postJson('/api/v1/salones', ['nombre' => 'Otro'])->assertCreated()->json('data.id');
        $otraClave = $this->postJson("/api/v1/salones/{$otroSalon}/placa/clave")->assertCreated()->json('data.clave');

        $this->placa('GET', 'ordenes', [], $otraClave)->assertOk()->assertJsonPath('ordenes', []);
        $this->placa('POST', 'confirmar', ['codigo' => $codigo, 'resultado' => 'ok'], $otraClave)->assertJsonPath('estado', 'ignorada');
        $this->assertTrue($this->luz(1)->actuador->ocupado);
    }
}

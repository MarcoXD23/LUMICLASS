<?php

namespace Tests\Feature\Api;

use App\Enums\EstadoLuz;
use App\Enums\ModoZona;
use App\Models\Actuador;
use App\Models\Evento;
use App\Models\Luz;
use App\Models\Zona;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ComandoLucesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->iniciarSesion();
    }

    private function ordenar(Luz $luz, string $accion, ?string $idSolicitud = null)
    {
        return $this->postJson("/api/v1/luces/{$luz->id}/comando", [
            'accion' => $accion,
            'id_solicitud' => $idSolicitud ?? (string) Str::uuid(),
        ]);
    }

    public function test_encender_guarda_estado_deseado_y_registra_evento(): void
    {
        $luz = Luz::factory()->create();

        $this->ordenar($luz, 'encender')
            ->assertOk()
            ->assertJsonPath('cambio', true)
            ->assertJsonPath('resultado', 'completada')
            ->assertJsonPath('data.estado_deseado', 'encendida')
            // El servo simulado responde "ok" por defecto: el estado real queda confirmado.
            ->assertJsonPath('data.estado_real', 'encendida');

        $this->assertSame(EstadoLuz::Encendida, $luz->fresh()->estado_deseado);
        $this->assertDatabaseHas('eventos', ['tipo' => 'luz.comando', 'entidad_tipo' => 'luz', 'entidad_id' => $luz->id]);
    }

    public function test_orden_innecesaria_no_cambia_nada(): void
    {
        $luz = Luz::factory()->create(['estado_deseado' => EstadoLuz::Apagada, 'estado_real' => EstadoLuz::Apagada]);

        $this->ordenar($luz, 'apagar')->assertOk()->assertJsonPath('cambio', false)->assertJsonPath('resultado', 'sin_cambio');

        $this->assertSame(0, Evento::where('tipo', 'luz.comando')->count());
    }

    public function test_si_el_estado_real_es_conocido_manda_sobre_el_deseado(): void
    {
        // Alguien encendió la luz a mano: real=encendida aunque el último deseo fue apagar.
        $luz = Luz::factory()->create(['estado_deseado' => EstadoLuz::Apagada, 'estado_real' => EstadoLuz::Encendida]);

        $this->ordenar($luz, 'apagar')->assertOk()->assertJsonPath('cambio', true);
        $this->ordenar($luz, 'apagar')->assertOk()->assertJsonPath('cambio', false);
    }

    public function test_con_estado_real_desconocido_el_usuario_puede_reintentar(): void
    {
        $luz = Luz::factory()->create(['estado_deseado' => EstadoLuz::Encendida, 'estado_real' => EstadoLuz::Desconocida]);

        $this->ordenar($luz, 'encender')->assertOk()->assertJsonPath('resultado', 'completada');
        $this->assertSame(EstadoLuz::Encendida, $luz->fresh()->estado_real);
    }

    public function test_solicitud_duplicada_devuelve_la_misma_respuesta_sin_ejecutar_otra_vez(): void
    {
        $luz = Luz::factory()->create();
        $id = (string) Str::uuid();

        $primera = $this->ordenar($luz, 'encender', $id)->assertOk();
        $segunda = $this->ordenar($luz, 'encender', $id)->assertOk()->assertHeader('X-Solicitud-Repetida', 'true');

        // Mismo contenido (assertEquals: MySQL puede guardar las claves del JSON en otro orden).
        $this->assertEquals($primera->json(), $segunda->json());
        $this->assertSame(1, Evento::where('tipo', 'luz.comando')->count());
    }

    public function test_id_solicitud_reutilizado_en_otra_ruta_responde_409(): void
    {
        [$luz1, $luz2] = Luz::factory()->count(2)->create();
        $id = (string) Str::uuid();

        $this->ordenar($luz1, 'encender', $id)->assertOk();
        $this->ordenar($luz2, 'encender', $id)
            ->assertStatus(409)
            ->assertJsonPath('error.codigo', 'id_solicitud_reutilizado');
    }

    public function test_servo_ocupado_responde_409(): void
    {
        $luz = Luz::factory()->for(Actuador::factory()->ocupado(), 'actuador')->create();

        $this->ordenar($luz, 'encender')->assertStatus(409)->assertJsonPath('error.codigo', 'actuador_ocupado');
        $this->assertSame(EstadoLuz::Apagada, $luz->fresh()->estado_deseado);
    }

    public function test_servo_en_falla_es_estado_imposible_y_queda_en_historial(): void
    {
        $luz = Luz::factory()->for(Actuador::factory()->enFalla(), 'actuador')->create();

        $this->ordenar($luz, 'encender')->assertStatus(409)->assertJsonPath('error.codigo', 'actuador_no_disponible');

        $this->assertDatabaseHas('eventos', ['tipo' => 'comando.rechazado', 'severidad' => 'advertencia', 'entidad_id' => $luz->id]);
    }

    public function test_luz_sin_servo_responde_409(): void
    {
        $luz = Luz::factory()->sinActuador()->create();

        $this->ordenar($luz, 'encender')->assertStatus(409)->assertJsonPath('error.codigo', 'sin_actuador');
    }

    public function test_un_rechazo_no_se_guarda_como_solicitud_procesada(): void
    {
        $actuador = Actuador::factory()->ocupado()->create();
        $luz = Luz::factory()->for($actuador, 'actuador')->create();
        $id = (string) Str::uuid();

        $this->ordenar($luz, 'encender', $id)->assertStatus(409);

        $actuador->update(['ocupado' => false]);
        $this->ordenar($luz, 'encender', $id)->assertOk()->assertJsonPath('cambio', true);
    }

    public function test_orden_manual_en_zona_automatica_la_pasa_a_manual(): void
    {
        $zona = Zona::factory()->create();
        $luz = Luz::factory()->for($zona)->create();

        $this->ordenar($luz, 'encender')->assertOk();

        $this->assertSame(ModoZona::Manual, $zona->fresh()->modo);
        $this->assertDatabaseHas('eventos', ['tipo' => 'zona.modo', 'entidad_id' => $zona->id]);
    }

    public function test_datos_invalidos_responden_400_en_espanol(): void
    {
        $luz = Luz::factory()->create();

        $this->postJson("/api/v1/luces/{$luz->id}/comando", ['accion' => 'parpadear', 'id_solicitud' => 'abc'])
            ->assertStatus(400)
            ->assertJsonPath('error.codigo', 'datos_invalidos')
            ->assertJsonPath('error.detalles.accion.0', 'El valor de acción no es válido.')
            ->assertJsonPath('error.detalles.id_solicitud.0', 'El campo id de solicitud debe ser un UUID válido.');
    }

    public function test_comando_por_zona_continua_aunque_una_luz_falle(): void
    {
        $zona = Zona::factory()->manual()->create();
        $buena = Luz::factory()->for($zona)->create();
        $mala = Luz::factory()->for($zona)->for(Actuador::factory()->enFalla(), 'actuador')->create();
        $yaApagada = Luz::factory()->for($zona)->create();

        $respuesta = $this->postJson("/api/v1/zonas/{$zona->id}/comando", [
            'accion' => 'encender',
            'id_solicitud' => (string) Str::uuid(),
        ])->assertOk();

        $porLuz = collect($respuesta->json('resultados'))->keyBy('luz_id');
        $this->assertSame('completada', $porLuz[$buena->id]['resultado']);
        $this->assertSame('rechazada', $porLuz[$mala->id]['resultado']);
        $this->assertSame('actuador_no_disponible', $porLuz[$mala->id]['codigo']);
        $this->assertSame('completada', $porLuz[$yaApagada->id]['resultado']);
        $respuesta->assertJsonCount(3, 'data.luces');
    }
}

<?php

namespace Tests\Feature\Api;

use App\Drivers\EscenarioSimulado;
use App\Enums\EstadoLuz;
use App\Enums\RespuestaSimulada;
use App\Models\Evento;
use App\Models\Luz;
use App\Models\Regla;
use App\Models\Salon;
use App\Models\Sensor;
use App\Models\Zona;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/** Reglas iniciales del seeder: ocupado → encender (prioridad 10) y vacío 300 s → apagar (prioridad 20). */
class MotorReglasTest extends TestCase
{
    use RefreshDatabase;

    private Salon $salon;

    protected function setUp(): void
    {
        parent::setUp();

        $this->salon = $this->iniciarSesionDemo();
    }

    private function presencia(bool $hay, ?int $zonaId = null): void
    {
        $this->postJson("/api/v1/salones/{$this->salon->id}/sim/presencia", array_filter(['presencia' => $hay, 'zona_id' => $zonaId], fn ($v) => $v !== null))->assertOk();
    }

    private function tick(): void
    {
        $this->artisan('lumiclass:tick')->assertSuccessful();
    }

    private function encendidas(): int
    {
        return Luz::where('estado_real', EstadoLuz::Encendida)->count();
    }

    public function test_vacio_apaga_solo_despues_de_la_duracion_de_la_regla(): void
    {
        $this->presencia(true);
        $this->presencia(false);
        $this->assertSame(4, $this->encendidas());

        $this->travel(299)->seconds();
        $this->tick();
        $this->assertSame(4, $this->encendidas());

        $this->travel(2)->seconds();
        $this->tick();
        $this->assertSame(0, $this->encendidas());
        $this->assertSame(4, Evento::where('tipo', 'luz.comando')->where('origen', 'regla')->where('datos->accion', 'apagar')->count());
    }

    public function test_factor_de_tiempo_acorta_la_espera_para_la_demo(): void
    {
        config(['lumiclass.reglas.factor_tiempo' => 0.1]);

        $this->presencia(true);
        $this->presencia(false);
        $this->travel(31)->seconds();
        $this->tick();

        $this->assertSame(0, $this->encendidas());
    }

    public function test_si_vuelve_alguien_antes_de_tiempo_no_se_apaga(): void
    {
        $this->presencia(true);
        $this->presencia(false);
        $this->travel(200)->seconds();
        $this->presencia(true);
        $this->travel(200)->seconds();
        $this->tick();

        $this->assertSame(4, $this->encendidas());
    }

    public function test_zona_en_modo_manual_ignora_las_reglas(): void
    {
        $zona = Zona::orderBy('id')->first();
        $this->patchJson("/api/v1/zonas/{$zona->id}/modo", ['modo' => 'manual'])->assertOk();

        $this->presencia(true);

        $this->assertSame(0, $zona->luces()->where('estado_real', EstadoLuz::Encendida)->count());
        $this->assertSame(2, $this->encendidas());
    }

    public function test_sensor_en_falla_impide_apagar_automaticamente(): void
    {
        $zona = Zona::orderBy('id')->first();
        // Agrega un segundo sensor a la zona para que quede uno activo diciendo "vacío".
        $otro = Sensor::factory()->for($zona)->create();

        $this->presencia(true, $zona->id);
        $this->patchJson("/api/v1/sim/sensores/{$otro->id}", ['conexion' => 'falla'])->assertOk();
        $this->presencia(false, $zona->id);

        $this->travel(400)->seconds();
        $this->tick();

        $this->assertSame(2, $zona->luces()->where('estado_real', EstadoLuz::Encendida)->count());
    }

    public function test_regla_desactivada_no_se_aplica_y_la_prioridad_manda(): void
    {
        Regla::query()->update(['activa' => false]);
        Regla::factory()->for($this->salon)->create(['prioridad' => 50, 'condicion' => ['presencia' => 'ocupado'], 'accion' => ['accion' => 'encender']]);
        // Prioridad más alta (número menor) gana: regla "rara" que apaga con presencia.
        Regla::factory()->for($this->salon)->create(['prioridad' => 1, 'condicion' => ['presencia' => 'ocupado'], 'accion' => ['accion' => 'apagar']]);

        $this->presencia(true);

        $this->assertSame(0, $this->encendidas());
    }

    public function test_regla_de_una_zona_no_afecta_a_otra(): void
    {
        [$primera, $segunda] = Zona::orderBy('id')->get();
        Regla::query()->update(['activa' => false]);
        Regla::factory()->for($this->salon)->create(['zona_id' => $segunda->id, 'condicion' => ['presencia' => 'ocupado'], 'accion' => ['accion' => 'encender']]);

        $this->presencia(true);

        $this->assertSame(0, $primera->luces()->where('estado_real', EstadoLuz::Encendida)->count());
        $this->assertSame(2, $segunda->luces()->where('estado_real', EstadoLuz::Encendida)->count());
    }

    public function test_un_servo_en_falla_no_llena_el_historial_de_errores(): void
    {
        $luz = Luz::orderBy('id')->first();
        app(EscenarioSimulado::class)->definirRespuesta($luz->actuador, RespuestaSimulada::Falla);

        $this->presencia(true);
        foreach (range(1, 5) as $_) {
            $this->travel(3)->seconds();
            $this->tick();
        }

        $this->assertSame(1, Evento::where('tipo', 'actuador.falla')->count());
        $this->assertSame(3, $this->encendidas());
    }

    public function test_orden_manual_pasa_la_zona_a_manual_y_la_regla_no_la_revierte(): void
    {
        $this->presencia(true);
        $luz = Luz::orderBy('id')->first();

        $this->postJson("/api/v1/luces/{$luz->id}/comando", ['accion' => 'apagar', 'id_solicitud' => (string) Str::uuid()])->assertOk();
        $this->travel(3)->seconds();
        $this->tick();

        $this->assertSame(EstadoLuz::Apagada, $luz->fresh()->estado_real);
    }

    public function test_pedir_encender_una_luz_ya_encendida_evita_que_la_regla_la_apague(): void
    {
        $this->presencia(true);
        $this->presencia(false);
        $luz = Luz::orderBy('id')->first();

        // El salón quedó vacío pero el usuario quiere la luz encendida: aunque ya lo está, su orden cuenta.
        $this->postJson("/api/v1/luces/{$luz->id}/comando", ['accion' => 'encender', 'id_solicitud' => (string) Str::uuid()])
            ->assertOk()
            ->assertJsonPath('resultado', 'sin_cambio');

        $this->travel(301)->seconds();
        $this->tick();

        $this->assertSame(EstadoLuz::Encendida, $luz->fresh()->estado_real);
    }

    public function test_interruptor_manual_en_zona_automatica_se_corrige_en_el_siguiente_tick(): void
    {
        $this->presencia(true);
        $luz = Luz::orderBy('id')->first();

        $this->postJson("/api/v1/sim/luces/{$luz->id}/interruptor", ['estado' => 'apagada'])->assertOk();
        $this->tick();

        $this->assertSame(EstadoLuz::Encendida, $luz->fresh()->estado_real);
    }
}

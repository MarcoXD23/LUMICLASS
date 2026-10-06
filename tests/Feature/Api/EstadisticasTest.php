<?php

namespace Tests\Feature\Api;

use App\Enums\EstadoLuz;
use App\Models\CambioLuz;
use App\Models\CambioOcupacion;
use App\Models\Salon;
use App\Models\User;
use App\Servicios\CreadorSalon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Tests\TestCase;

class EstadisticasTest extends TestCase
{
    use RefreshDatabase;

    private Salon $salon;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow('2026-10-06 08:00:00');
        $usuario = $this->iniciarSesion();
        $this->salon = app(CreadorSalon::class)->crearEjemplo($usuario);
        // Sin la regla de "apagar tras 5 min" para controlar a mano cuándo se apaga cada luz.
        $this->salon->reglas()->where('prioridad', 20)->update(['activa' => false]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function a(string $hora): void
    {
        Carbon::setTestNow("2026-10-06 {$hora}");
    }

    private function estadisticas(string $parametros = 'rango=hoy&zona_horaria=UTC')
    {
        return $this->getJson("/api/v1/salones/{$this->salon->id}/estadisticas?{$parametros}");
    }

    /**
     * 09:00 entra gente (la regla enciende las 4 luces) · 10:00 queda vacío ·
     * 11:00 se apaga a mano la zona frontal · 12:00 se consulta.
     */
    public function test_horas_encendidas_ocupado_y_desperdicio_calculadas_a_mano(): void
    {
        $this->a('09:00:00');
        $this->postJson("/api/v1/salones/{$this->salon->id}/sim/presencia", ['presencia' => true])->assertOk();

        $this->a('10:00:00');
        $this->postJson("/api/v1/salones/{$this->salon->id}/sim/presencia", ['presencia' => false])->assertOk();

        $this->a('11:00:00');
        $frontal = $this->salon->zonas()->orderBy('id')->first();
        $this->postJson("/api/v1/zonas/{$frontal->id}/comando", ['accion' => 'apagar', 'id_solicitud' => (string) Str::uuid()])->assertOk();

        $this->a('12:00:00');
        $r = $this->estadisticas()->assertOk();

        // Frontal: 2 luces × 2 h (9→11). Posterior: 2 luces × 3 h (9→12). Total 10 h.
        $r->assertJsonPath('data.totales.segundos_encendidas', 10 * 3600)
            // Ocupado solo de 9 a 10.
            ->assertJsonPath('data.totales.segundos_ocupado', 3600)
            // Encendidas con la zona vacía: frontal 2 × 1 h (10→11) + posterior 2 × 2 h (10→12) = 6 h.
            ->assertJsonPath('data.totales.segundos_desperdicio', 6 * 3600)
            ->assertJsonPath('data.totales.encendidos', 4)
            ->assertJsonPath('data.totales.apagados', 2)
            ->assertJsonPath('data.totales.ordenes.regla', 4)
            ->assertJsonPath('data.totales.ordenes.usuario', 2)
            ->assertJsonPath('data.luces.0.segundos_encendida', 2 * 3600)
            ->assertJsonPath('data.luces.0.segundos_desperdicio', 3600)
            ->assertJsonPath('data.luces.3.segundos_encendida', 3 * 3600)
            ->assertJsonCount(1, 'data.por_dia')
            ->assertJsonPath('data.por_dia.0.fecha', '2026-10-06')
            ->assertJsonPath('data.por_dia.0.segundos_encendidas', 10 * 3600);
    }

    public function test_las_horas_se_reparten_por_dia_segun_la_hora_local(): void
    {
        // 04:00 UTC = 23:00 del día anterior en Bogotá (UTC-5); se apaga a las 06:00 UTC = 01:00 local.
        $luz = $this->salon->luces()->orderBy('luces.id')->first();
        $this->a('04:00:00');
        $luz->update(['estado_real' => EstadoLuz::Encendida]);
        $this->a('06:00:00');
        $luz->update(['estado_real' => EstadoLuz::Apagada]);

        $this->a('12:00:00');
        $dias = collect($this->estadisticas('rango=7d&zona_horaria=America/Bogota')->assertOk()->json('data.por_dia'))
            ->keyBy('fecha');

        $this->assertCount(7, $dias);
        $this->assertSame(3600, $dias['2026-10-05']['segundos_encendidas']);
        $this->assertSame(3600, $dias['2026-10-06']['segundos_encendidas']);
    }

    public function test_lo_anterior_al_periodo_no_cuenta_pero_si_su_estado_inicial(): void
    {
        // Encendida desde ayer a las 20:00 y sigue encendida: "hoy" cuenta desde la medianoche.
        $luz = $this->salon->luces()->orderBy('luces.id')->first();
        Carbon::setTestNow('2026-10-05 20:00:00');
        $luz->update(['estado_real' => EstadoLuz::Encendida]);

        $this->a('03:00:00');
        $this->estadisticas()->assertOk()->assertJsonPath('data.totales.segundos_encendidas', 3 * 3600);
    }

    public function test_estado_desconocido_no_suma_horas(): void
    {
        $luz = $this->salon->luces()->orderBy('luces.id')->first();
        $this->a('09:00:00');
        $luz->update(['estado_real' => EstadoLuz::Encendida]);
        $this->a('10:00:00');
        $luz->update(['estado_real' => EstadoLuz::Desconocida]);

        $this->a('12:00:00');
        $this->estadisticas()->assertOk()->assertJsonPath('data.totales.segundos_encendidas', 3600);
    }

    public function test_cuenta_las_fallas_del_periodo(): void
    {
        $luz = $this->salon->luces()->orderBy('luces.id')->first();
        $this->a('09:00:00');
        $this->patchJson("/api/v1/sim/actuadores/{$luz->actuador_id}", ['respuesta' => 'falla'])->assertOk();
        $this->postJson("/api/v1/luces/{$luz->id}/comando", ['accion' => 'encender', 'id_solicitud' => (string) Str::uuid()])->assertOk();

        $this->estadisticas()->assertOk()->assertJsonPath('data.totales.fallas', 1);
    }

    public function test_reiniciar_el_simulador_anota_las_luces_que_se_apagan(): void
    {
        $luz = $this->salon->luces()->orderBy('luces.id')->first();
        $luz->update(['estado_real' => EstadoLuz::Encendida]);

        $this->postJson("/api/v1/salones/{$this->salon->id}/sim/reiniciar")->assertOk();

        $this->assertSame(EstadoLuz::Apagada, CambioLuz::where('luz_id', $luz->id)->latest('id')->first()->estado);
        // Las otras 3 ya estaban apagadas: solo tienen su fila inicial, no se duplican.
        $this->assertSame(3, CambioLuz::where('luz_id', '!=', $luz->id)->count());
    }

    public function test_la_ocupacion_solo_se_anota_cuando_cambia(): void
    {
        $this->postJson("/api/v1/salones/{$this->salon->id}/sim/presencia", ['presencia' => true])->assertOk();
        $this->postJson("/api/v1/salones/{$this->salon->id}/sim/presencia", ['presencia' => true])->assertOk();

        $this->assertSame(2, CambioOcupacion::count());
        $this->assertSame(['ocupado', 'ocupado'], CambioOcupacion::pluck('ocupacion')->map->value->all());
    }

    public function test_valida_el_rango_y_la_zona_horaria(): void
    {
        $this->estadisticas('rango=1año&zona_horaria=Marte/Base')
            ->assertStatus(400)
            ->assertJsonValidationErrors(['rango', 'zona_horaria'], 'error.detalles');
    }

    public function test_otra_cuenta_no_ve_las_estadisticas(): void
    {
        $this->iniciarSesion(User::factory()->create());

        $this->estadisticas()->assertNotFound();
    }
}

<?php

namespace Tests\Feature\Api;

use App\Enums\EstadoLuz;
use App\Enums\ModoZona;
use App\Models\Salon;
use App\Models\User;
use App\Servicios\CreadorSalon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/** Una cuenta nunca ve ni modifica lo de otra: todo responde 404, como si no existiera. */
class AislamientoTest extends TestCase
{
    use RefreshDatabase;

    private Salon $salonDeAna;

    private Salon $salonDeBeto;

    protected function setUp(): void
    {
        parent::setUp();

        $creador = app(CreadorSalon::class);
        $this->salonDeAna = $creador->crearEjemplo(User::factory()->create(), 'Salón de Ana');
        $this->salonDeBeto = $creador->crearEjemplo(User::factory()->create(), 'Salón de Beto');

        // Beto inicia sesión e intenta tocar lo de Ana.
        $this->iniciarSesion($this->salonDeBeto->dueno);
    }

    public function test_la_lista_solo_muestra_los_salones_propios(): void
    {
        $this->getJson('/api/v1/salones')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.nombre', 'Salón de Beto');
    }

    public function test_no_puede_leer_nada_de_otra_cuenta(): void
    {
        $a = $this->salonDeAna;
        $zona = $a->zonas()->first();
        $luz = $a->luces()->first();
        $sensor = $a->sensores()->first();
        $regla = $a->reglas()->first();

        foreach ([
            "/api/v1/salones/{$a->id}",
            "/api/v1/salones/{$a->id}/estado",
            "/api/v1/salones/{$a->id}/zonas",
            "/api/v1/salones/{$a->id}/luces",
            "/api/v1/salones/{$a->id}/sensores",
            "/api/v1/salones/{$a->id}/reglas",
            "/api/v1/salones/{$a->id}/eventos",
            "/api/v1/salones/{$a->id}/sim/estado",
            "/api/v1/zonas/{$zona->id}",
            "/api/v1/luces/{$luz->id}",
            "/api/v1/sensores/{$sensor->id}",
            "/api/v1/reglas/{$regla->id}",
        ] as $url) {
            $this->getJson($url)->assertNotFound()->assertJsonPath('error.codigo', 'no_encontrado');
        }
    }

    public function test_no_puede_modificar_nada_de_otra_cuenta(): void
    {
        $a = $this->salonDeAna;
        $zona = $a->zonas()->first();
        $luz = $a->luces()->first();
        $regla = $a->reglas()->first();
        $orden = fn () => ['accion' => 'encender', 'id_solicitud' => (string) Str::uuid()];

        $this->postJson("/api/v1/luces/{$luz->id}/comando", $orden())->assertNotFound();
        $this->postJson("/api/v1/zonas/{$zona->id}/comando", $orden())->assertNotFound();
        $this->patchJson("/api/v1/zonas/{$zona->id}/modo", ['modo' => 'manual'])->assertNotFound();
        $this->putJson("/api/v1/reglas/{$regla->id}", ['nombre' => 'x'])->assertNotFound();
        $this->deleteJson("/api/v1/reglas/{$regla->id}")->assertNotFound();
        $this->patchJson("/api/v1/salones/{$a->id}", ['nombre' => 'Mío'])->assertNotFound();
        $this->deleteJson("/api/v1/salones/{$a->id}")->assertNotFound();
        $this->postJson("/api/v1/salones/{$a->id}/reglas", [])->assertNotFound();

        $this->assertSame(EstadoLuz::Apagada, $luz->fresh()->estado_real);
        $this->assertSame(ModoZona::Automatico, $zona->fresh()->modo);
        $this->assertNotNull($regla->fresh());
        $this->assertSame('Salón de Ana', $a->fresh()->nombre);
        $this->assertSame(0, $a->eventos()->count());
    }

    public function test_no_puede_usar_el_simulador_de_otra_cuenta(): void
    {
        $a = $this->salonDeAna;

        $this->postJson("/api/v1/salones/{$a->id}/sim/presencia", ['presencia' => true])->assertNotFound();
        $this->postJson("/api/v1/salones/{$a->id}/sim/reiniciar")->assertNotFound();
        $this->patchJson('/api/v1/sim/sensores/'.$a->sensores()->first()->id, ['conexion' => 'falla'])->assertNotFound();
        $this->patchJson('/api/v1/sim/actuadores/'.$a->actuadores()->first()->id, ['respuesta' => 'falla'])->assertNotFound();
        $this->postJson('/api/v1/sim/luces/'.$a->luces()->first()->id.'/interruptor', ['estado' => 'encendida'])->assertNotFound();

        $this->assertSame(0, $a->eventos()->count());
    }

    public function test_no_puede_simular_presencia_en_una_zona_ajena_desde_su_salon(): void
    {
        $zonaDeAna = $this->salonDeAna->zonas()->first();

        $this->postJson("/api/v1/salones/{$this->salonDeBeto->id}/sim/presencia", ['presencia' => true, 'zona_id' => $zonaDeAna->id])
            ->assertStatus(400)
            ->assertJsonValidationErrors(['zona_id'], 'error.detalles');
    }

    public function test_el_mismo_id_solicitud_en_dos_cuentas_no_choca(): void
    {
        $id = (string) Str::uuid();
        $luzDeBeto = $this->salonDeBeto->luces()->first();
        $this->postJson("/api/v1/luces/{$luzDeBeto->id}/comando", ['accion' => 'encender', 'id_solicitud' => $id])
            ->assertOk()->assertJsonPath('resultado', 'completada');

        $this->iniciarSesion($this->salonDeAna->dueno);
        $luzDeAna = $this->salonDeAna->luces()->first();
        $this->postJson("/api/v1/luces/{$luzDeAna->id}/comando", ['accion' => 'encender', 'id_solicitud' => $id])
            ->assertOk()->assertJsonPath('resultado', 'completada')->assertHeaderMissing('X-Solicitud-Repetida');
    }

    public function test_las_reglas_de_un_salon_no_afectan_a_otro(): void
    {
        // Beto cambia SU regla de presencia por una que apaga: no debe afectar a Ana.
        $this->salonDeBeto->reglas()->update(['activa' => false]);
        $this->salonDeBeto->reglas()->create([
            'nombre' => 'Rara', 'prioridad' => 1,
            'condicion' => ['presencia' => 'ocupado'], 'accion' => ['accion' => 'apagar'],
        ]);

        $this->iniciarSesion($this->salonDeAna->dueno);
        $this->postJson("/api/v1/salones/{$this->salonDeAna->id}/sim/presencia", ['presencia' => true])->assertOk();

        $this->assertSame(4, $this->salonDeAna->luces()->where('estado_real', EstadoLuz::Encendida)->count());
    }

    public function test_el_historial_solo_muestra_eventos_propios(): void
    {
        $this->postJson("/api/v1/salones/{$this->salonDeBeto->id}/sim/presencia", ['presencia' => true])->assertOk();

        $this->iniciarSesion($this->salonDeAna->dueno);
        $this->getJson("/api/v1/salones/{$this->salonDeAna->id}/eventos")->assertOk()->assertJsonCount(0, 'data');
    }
}

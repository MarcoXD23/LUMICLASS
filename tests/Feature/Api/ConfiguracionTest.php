<?php

namespace Tests\Feature\Api;

use App\Enums\ModoZona;
use App\Models\Actuador;
use App\Models\CambioOcupacion;
use App\Models\Luz;
use App\Models\Regla;
use App\Models\Salon;
use App\Models\Sensor;
use App\Models\User;
use App\Models\Zona;
use App\Servicios\ConfiguracionSalon;
use App\Servicios\CreadorSalon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConfiguracionTest extends TestCase
{
    use RefreshDatabase;

    private Salon $salon;

    private Zona $frontal;

    private Zona $posterior;

    protected function setUp(): void
    {
        parent::setUp();

        $this->salon = app(CreadorSalon::class)->crearEjemplo($this->iniciarSesion());
        [$this->frontal, $this->posterior] = $this->salon->zonas()->orderBy('id')->get()->all();
    }

    // ---- Zonas ----

    public function test_crear_zona_con_luces_servos_y_sensores(): void
    {
        $this->postJson("/api/v1/salones/{$this->salon->id}/zonas", ['nombre' => 'Ventana', 'luces' => 3, 'sensores' => 2])
            ->assertCreated()
            ->assertJsonPath('data.nombre', 'Ventana')
            ->assertJsonPath('data.modo', 'automatico')
            ->assertJsonCount(3, 'data.luces')
            ->assertJsonCount(2, 'data.sensores')
            ->assertJsonPath('data.luces.0.actuador.nombre', 'Servo 5')
            ->assertJsonPath('data.luces.2.estado_real', 'apagada');

        $this->assertSame(7, $this->salon->actuadores()->count());
        $this->assertDatabaseHas('eventos', ['salon_id' => $this->salon->id, 'tipo' => 'configuracion']);
    }

    public function test_por_defecto_la_zona_nueva_trae_2_luces_y_1_sensor(): void
    {
        $this->postJson("/api/v1/salones/{$this->salon->id}/zonas", ['nombre' => 'Ventana'])
            ->assertCreated()->assertJsonCount(2, 'data.luces')->assertJsonCount(1, 'data.sensores');
    }

    public function test_nombres_de_zona_unicos_en_el_salon_y_limites(): void
    {
        $this->postJson("/api/v1/salones/{$this->salon->id}/zonas", ['nombre' => 'Zona posterior'])
            ->assertStatus(400)->assertJsonPath('error.detalles.nombre.0', 'Ese nombre ya está en uso.');
        $this->postJson("/api/v1/salones/{$this->salon->id}/zonas", ['nombre' => 'X', 'luces' => 11, 'sensores' => 4])
            ->assertStatus(400)->assertJsonValidationErrors(['luces', 'sensores'], 'error.detalles');

        // Otro salón sí puede tener una zona con el mismo nombre.
        $otro = app(CreadorSalon::class)->crear(auth()->user(), 'Aula 2', 1, 1);
        $this->postJson("/api/v1/salones/{$otro->id}/zonas", ['nombre' => 'Zona posterior'])->assertCreated();

        Zona::factory()->count(ConfiguracionSalon::MAXIMO_ZONAS - 2)->for($this->salon)->create();
        $this->postJson("/api/v1/salones/{$this->salon->id}/zonas", ['nombre' => 'Una más'])
            ->assertStatus(409)->assertJsonPath('error.codigo', 'limite_zonas');
    }

    public function test_renombrar_zona(): void
    {
        $this->patchJson("/api/v1/zonas/{$this->frontal->id}", ['nombre' => 'Pizarra'])->assertOk()->assertJsonPath('data.nombre', 'Pizarra');
        // Su mismo nombre no choca consigo misma.
        $this->patchJson("/api/v1/zonas/{$this->frontal->id}", ['nombre' => 'Pizarra'])->assertOk();
        $this->patchJson("/api/v1/zonas/{$this->frontal->id}", ['nombre' => 'Zona posterior'])->assertStatus(400);
    }

    public function test_quitar_zona_borra_luces_servos_sensores_y_sus_reglas(): void
    {
        $reglaDeZona = Regla::factory()->for($this->salon)->create(['zona_id' => $this->frontal->id]);
        $servos = $this->frontal->luces()->pluck('actuador_id');

        $this->deleteJson("/api/v1/zonas/{$this->frontal->id}")->assertNoContent();

        $this->assertNull(Zona::find($this->frontal->id));
        $this->assertSame(0, Luz::where('zona_id', $this->frontal->id)->count());
        $this->assertSame(0, Actuador::whereIn('id', $servos)->count());
        $this->assertSame(0, Sensor::where('zona_id', $this->frontal->id)->count());
        $this->assertNull(Regla::find($reglaDeZona->id));
        $this->assertSame(2, $this->salon->reglas()->count()); // las globales siguen
        $this->assertSame(2, $this->salon->actuadores()->count());
    }

    public function test_no_se_puede_quitar_la_ultima_zona(): void
    {
        $this->deleteJson("/api/v1/zonas/{$this->frontal->id}")->assertNoContent();
        $this->deleteJson("/api/v1/zonas/{$this->posterior->id}")
            ->assertStatus(409)->assertJsonPath('error.codigo', 'ultima_zona');
    }

    // ---- Luces ----

    public function test_agregar_luz_con_su_servo_y_numeracion_sin_repetir(): void
    {
        $luz = $this->frontal->luces()->first();
        $this->deleteJson("/api/v1/luces/{$luz->id}")->assertNoContent(); // libera "Servo 1"

        $this->postJson("/api/v1/zonas/{$this->frontal->id}/luces", ['nombre' => 'Luz de la ventana'])
            ->assertCreated()
            ->assertJsonPath('data.nombre', 'Luz de la ventana')
            ->assertJsonPath('data.zona_id', $this->frontal->id)
            ->assertJsonPath('data.actuador.nombre', 'Servo 5')
            ->assertJsonPath('data.actuador.conexion', 'activo');
    }

    public function test_nombre_de_luz_unico_en_el_salon_y_limite_por_zona(): void
    {
        $this->postJson("/api/v1/zonas/{$this->frontal->id}/luces", ['nombre' => 'Luz posterior derecha'])
            ->assertStatus(400)->assertJsonPath('error.detalles.nombre.0', 'Ese nombre ya está en uso.');
        $this->postJson("/api/v1/zonas/{$this->frontal->id}/luces", ['nombre' => 'Otra', 'zona_id' => $this->posterior->id])
            ->assertStatus(400)->assertJsonValidationErrors(['zona_id'], 'error.detalles');

        foreach (range(3, ConfiguracionSalon::MAXIMO_LUCES_POR_ZONA) as $n) {
            $this->postJson("/api/v1/zonas/{$this->frontal->id}/luces", ['nombre' => "Extra {$n}"])->assertCreated();
        }
        $this->postJson("/api/v1/zonas/{$this->frontal->id}/luces", ['nombre' => 'Sobra'])
            ->assertStatus(409)->assertJsonPath('error.codigo', 'limite_luces');
    }

    public function test_renombrar_y_mover_luz_a_otra_zona_del_mismo_salon(): void
    {
        $luz = $this->frontal->luces()->orderBy('id')->first();

        $this->patchJson("/api/v1/luces/{$luz->id}", ['nombre' => 'Luz del escritorio', 'zona_id' => $this->posterior->id])
            ->assertOk()
            ->assertJsonPath('data.nombre', 'Luz del escritorio')
            ->assertJsonPath('data.zona_id', $this->posterior->id);

        $this->assertSame(3, $this->posterior->luces()->count());
        $this->assertDatabaseHas('eventos', ['tipo' => 'configuracion', 'entidad_id' => $luz->id]);
    }

    public function test_no_se_puede_mover_una_luz_a_una_zona_de_otro_salon_ni_ajeno(): void
    {
        $luz = $this->frontal->luces()->first();
        $miOtroSalon = app(CreadorSalon::class)->crear(auth()->user(), 'Aula 2', 1, 1);
        $ajeno = app(CreadorSalon::class)->crearEjemplo(User::factory()->create());

        foreach ([$miOtroSalon->zonas()->first()->id, $ajeno->zonas()->first()->id, 999999] as $zonaId) {
            $this->patchJson("/api/v1/luces/{$luz->id}", ['zona_id' => $zonaId])
                ->assertStatus(400)->assertJsonValidationErrors(['zona_id'], 'error.detalles');
        }
        $this->assertSame($this->frontal->id, $luz->fresh()->zona_id);
    }

    public function test_no_se_mueve_ni_quita_una_luz_con_el_servo_trabajando(): void
    {
        $luz = $this->frontal->luces()->first();
        $luz->actuador->update(['ocupado' => true]);

        $this->patchJson("/api/v1/luces/{$luz->id}", ['zona_id' => $this->posterior->id])
            ->assertStatus(409)->assertJsonPath('error.codigo', 'actuador_ocupado');
        $this->deleteJson("/api/v1/luces/{$luz->id}")->assertStatus(409);
        // Renombrar sí se puede: no mueve nada físico.
        $this->patchJson("/api/v1/luces/{$luz->id}", ['nombre' => 'Nuevo nombre'])->assertOk();
    }

    public function test_quitar_luz_borra_su_servo(): void
    {
        $luz = $this->frontal->luces()->first();
        $servo = $luz->actuador_id;

        $this->deleteJson("/api/v1/luces/{$luz->id}")->assertNoContent();

        $this->assertNull(Luz::find($luz->id));
        $this->assertNull(Actuador::find($servo));
    }

    // ---- Sensores ----

    public function test_agregar_renombrar_sensor_y_limite(): void
    {
        $id = $this->postJson("/api/v1/zonas/{$this->frontal->id}/sensores", ['nombre' => 'PIR de la puerta'])
            ->assertCreated()->assertJsonPath('data.tipo', 'pir')->json('data.id');

        $this->patchJson("/api/v1/sensores/{$id}", ['nombre' => 'PIR de la entrada'])->assertOk()->assertJsonPath('data.nombre', 'PIR de la entrada');
        $this->patchJson("/api/v1/sensores/{$id}", ['nombre' => 'Sensor PIR 2'])
            ->assertStatus(400)->assertJsonPath('error.detalles.nombre.0', 'Ese nombre ya está en uso.');

        $this->postJson("/api/v1/zonas/{$this->frontal->id}/sensores", ['nombre' => 'Tercero'])->assertCreated();
        $this->postJson("/api/v1/zonas/{$this->frontal->id}/sensores", ['nombre' => 'Cuarto'])
            ->assertStatus(409)->assertJsonPath('error.codigo', 'limite_sensores');
    }

    public function test_quitar_el_ultimo_sensor_de_una_zona_automatica_pide_confirmar(): void
    {
        $sensor = $this->frontal->sensores()->first();

        $this->deleteJson("/api/v1/sensores/{$sensor->id}")
            ->assertStatus(409)
            ->assertJsonPath('error.codigo', 'ultimo_sensor');
        $this->assertNotNull(Sensor::find($sensor->id));

        $this->deleteJson("/api/v1/sensores/{$sensor->id}?confirmar=1")->assertNoContent();
        $this->assertNull(Sensor::find($sensor->id));
    }

    public function test_en_zona_manual_o_con_mas_sensores_se_quita_sin_preguntar(): void
    {
        $this->posterior->update(['modo' => ModoZona::Manual]);
        $this->deleteJson('/api/v1/sensores/'.$this->posterior->sensores()->first()->id)->assertNoContent();

        $extra = Sensor::factory()->for($this->frontal)->create();
        $this->deleteJson("/api/v1/sensores/{$extra->id}")->assertNoContent();
    }

    public function test_quitar_un_sensor_actualiza_la_ocupacion(): void
    {
        $this->postJson("/api/v1/salones/{$this->salon->id}/sim/presencia", ['presencia' => true, 'zona_id' => $this->frontal->id])->assertOk();
        $sensor = $this->frontal->sensores()->first();

        $this->deleteJson("/api/v1/sensores/{$sensor->id}?confirmar=1")->assertNoContent();

        $this->getJson("/api/v1/salones/{$this->salon->id}/estado")->assertJsonPath('data.zonas.0.ocupacion', 'desconocida');
        $this->assertSame('desconocida', CambioOcupacion::where('zona_id', $this->frontal->id)->latest('id')->first()->ocupacion->value);
    }

    // ---- Seguridad ----

    public function test_nada_de_esto_funciona_sobre_otra_cuenta(): void
    {
        $ajeno = app(CreadorSalon::class)->crearEjemplo(User::factory()->create());
        $zona = $ajeno->zonas()->first();
        $luz = $zona->luces()->first();
        $sensor = $zona->sensores()->first();

        $this->postJson("/api/v1/salones/{$ajeno->id}/zonas", ['nombre' => 'X'])->assertNotFound();
        $this->patchJson("/api/v1/zonas/{$zona->id}", ['nombre' => 'X'])->assertNotFound();
        $this->deleteJson("/api/v1/zonas/{$zona->id}")->assertNotFound();
        $this->postJson("/api/v1/zonas/{$zona->id}/luces", ['nombre' => 'X'])->assertNotFound();
        $this->patchJson("/api/v1/luces/{$luz->id}", ['nombre' => 'X'])->assertNotFound();
        $this->deleteJson("/api/v1/luces/{$luz->id}")->assertNotFound();
        $this->postJson("/api/v1/zonas/{$zona->id}/sensores", ['nombre' => 'X'])->assertNotFound();
        $this->patchJson("/api/v1/sensores/{$sensor->id}", ['nombre' => 'X'])->assertNotFound();
        $this->deleteJson("/api/v1/sensores/{$sensor->id}?confirmar=1")->assertNotFound();

        $this->assertSame(2, $ajeno->zonas()->count());
        $this->assertSame(4, $ajeno->luces()->count());
        $this->assertSame(2, $ajeno->sensores()->count());
        $this->assertSame(0, $ajeno->eventos()->count());
    }
}

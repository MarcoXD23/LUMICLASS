<?php

namespace Tests\Feature\Api;

use App\Enums\EstadoConexion;
use App\Enums\EstadoLuz;
use App\Enums\ModoZona;
use App\Models\Actuador;
use App\Models\Luz;
use App\Models\Sensor;
use App\Models\Zona;
use Database\Seeders\SalonDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SimuladorTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(SalonDemoSeeder::class);
    }

    public function test_forzar_salon_ocupado_enciende_las_luces_por_regla(): void
    {
        $this->postJson('/api/v1/sim/presencia', ['presencia' => true])
            ->assertOk()
            ->assertJsonPath('data.sensores_actualizados', 2)
            ->assertJsonPath('data.ordenes_reglas', 4);

        $this->getJson('/api/v1/salon/estado')
            ->assertJsonPath('data.ocupacion', 'ocupado')
            ->assertJsonPath('data.luces.encendidas', 4);

        $this->assertDatabaseHas('eventos', ['tipo' => 'luz.comando', 'origen' => 'regla']);
        $this->assertDatabaseHas('eventos', ['tipo' => 'sensor.presencia', 'origen' => 'simulador']);
    }

    public function test_presencia_por_zona_solo_afecta_esa_zona(): void
    {
        $zona = Zona::orderBy('id')->first();

        $this->postJson('/api/v1/sim/presencia', ['presencia' => true, 'zona_id' => $zona->id, 'conteo_personas' => 12])
            ->assertOk()
            ->assertJsonPath('data.sensores_actualizados', 1);

        $this->getJson('/api/v1/salon/estado')
            ->assertJsonPath('data.personas_detectadas', 12)
            ->assertJsonPath('data.zonas.0.ocupacion', 'ocupado')
            ->assertJsonPath('data.zonas.1.ocupacion', 'desconocida')
            ->assertJsonPath('data.luces.encendidas', 2);
    }

    public function test_sensor_en_falla_genera_alerta_y_no_se_usa(): void
    {
        $sensor = Sensor::first();

        $this->patchJson("/api/v1/sim/sensores/{$sensor->id}", ['conexion' => 'falla'])
            ->assertOk()
            ->assertJsonPath('cambio', true)
            ->assertJsonPath('data.conexion', 'falla');

        $this->getJson('/api/v1/salon/estado')->assertJsonPath('data.alertas.0.nivel', 'error');
        $this->assertDatabaseHas('eventos', ['tipo' => 'sensor.conexion', 'severidad' => 'error']);

        // Solo queda un sensor activo para simular.
        $this->postJson('/api/v1/sim/presencia', ['presencia' => true])->assertJsonPath('data.sensores_actualizados', 1);
    }

    public function test_sin_sensores_activos_responde_409(): void
    {
        Sensor::query()->update(['conexion' => EstadoConexion::Inactivo->value]);

        $this->postJson('/api/v1/sim/presencia', ['presencia' => true])
            ->assertStatus(409)
            ->assertJsonPath('error.codigo', 'sin_sensores_activos');
    }

    public function test_configurar_servo_y_ver_estado_del_simulador(): void
    {
        $actuador = Actuador::first();

        $this->patchJson("/api/v1/sim/actuadores/{$actuador->id}", ['respuesta' => 'lento', 'conexion' => 'inactivo'])
            ->assertOk()
            ->assertJsonPath('data.respuesta_simulada', 'lento')
            ->assertJsonPath('data.conexion', 'inactivo');

        $this->getJson('/api/v1/sim/estado')
            ->assertOk()
            ->assertJsonPath('data.driver', 'simulado')
            ->assertJsonPath('data.actuadores.0.respuesta_simulada', 'lento')
            ->assertJsonPath('data.actuadores.1.respuesta_simulada', 'ok');

        $this->assertDatabaseHas('eventos', ['tipo' => 'actuador.conexion', 'severidad' => 'error']);
    }

    public function test_configurar_servo_requiere_algun_dato_valido(): void
    {
        $actuador = Actuador::first();

        $this->patchJson("/api/v1/sim/actuadores/{$actuador->id}", [])->assertStatus(400);
        $this->patchJson("/api/v1/sim/actuadores/{$actuador->id}", ['respuesta' => 'explotar'])->assertStatus(400);
    }

    public function test_interruptor_manual_cambia_solo_el_estado_real(): void
    {
        $luz = Luz::first();

        $this->postJson("/api/v1/sim/luces/{$luz->id}/interruptor", ['estado' => 'encendida'])
            ->assertOk()
            ->assertJsonPath('data.estado_real', 'encendida')
            ->assertJsonPath('data.estado_deseado', 'apagada');

        $this->assertDatabaseHas('eventos', ['tipo' => 'luz.interruptor', 'entidad_id' => $luz->id]);
        $this->postJson("/api/v1/sim/luces/{$luz->id}/interruptor", ['estado' => 'desconocida'])->assertStatus(400);
    }

    public function test_reiniciar_vuelve_al_escenario_inicial(): void
    {
        $this->postJson('/api/v1/sim/presencia', ['presencia' => true]);
        Zona::query()->update(['modo' => ModoZona::Manual->value]);
        $this->patchJson('/api/v1/sim/actuadores/'.Actuador::first()->id, ['respuesta' => 'falla']);

        $this->postJson('/api/v1/sim/reiniciar')->assertOk();

        $this->assertSame(4, Luz::where('estado_real', EstadoLuz::Apagada)->count());
        $this->assertSame(2, Zona::where('modo', ModoZona::Automatico)->count());
        $this->assertSame(0, Sensor::whereNotNull('presencia')->count());
        $this->getJson('/api/v1/sim/estado')->assertJsonPath('data.actuadores.0.respuesta_simulada', 'ok');
        $this->assertDatabaseHas('eventos', ['tipo' => 'simulador.reinicio']);
    }

    public function test_con_driver_real_el_simulador_no_existe(): void
    {
        config(['lumiclass.driver' => 'real']);

        $this->postJson('/api/v1/sim/presencia', ['presencia' => true])
            ->assertNotFound()
            ->assertJsonPath('error.codigo', 'simulador_desactivado');
    }
}

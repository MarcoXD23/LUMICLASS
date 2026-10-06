<?php

namespace Tests\Feature\Api;

use App\Models\Actuador;
use App\Models\Luz;
use App\Models\Salon;
use App\Models\Sensor;
use App\Models\User;
use App\Models\Zona;
use Database\Seeders\SalonDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SaludYSalonTest extends TestCase
{
    use RefreshDatabase;

    public function test_salud_es_publica_e_informa_base_de_datos_y_driver(): void
    {
        $this->getJson('/api/v1/salud')
            ->assertOk()
            ->assertJson(['estado' => 'ok', 'base_datos' => 'ok', 'driver' => 'simulado']);
    }

    public function test_salon_inexistente_responde_404(): void
    {
        $this->iniciarSesion();

        $this->getJson('/api/v1/salones/999/estado')
            ->assertNotFound()
            ->assertJsonPath('error.codigo', 'no_encontrado');
    }

    public function test_estado_del_salon_de_ejemplo(): void
    {
        $salon = $this->iniciarSesionDemo();

        $this->getJson("/api/v1/salones/{$salon->id}/estado")
            ->assertOk()
            ->assertJsonPath('data.salon.nombre', 'Salón 101')
            ->assertJsonPath('data.ocupacion', 'desconocida')
            ->assertJsonPath('data.personas_detectadas', null)
            ->assertJsonPath('data.luces.total', 4)
            ->assertJsonPath('data.luces.apagadas', 4)
            ->assertJsonPath('data.luces.desconocidas', 0)
            ->assertJsonPath('data.sensores.activos', 2)
            ->assertJsonCount(2, 'data.zonas')
            ->assertJsonCount(0, 'data.alertas')
            ->assertJsonStructure(['data' => ['ultima_actualizacion', 'zonas' => [['modo', 'ocupacion', 'luces', 'sensores']]]]);
    }

    public function test_seeder_no_duplica_si_se_ejecuta_dos_veces(): void
    {
        $this->seed(SalonDemoSeeder::class);
        $this->seed(SalonDemoSeeder::class);

        $this->assertSame(1, User::count());
        $this->assertSame(1, Salon::count());
        $this->assertSame(4, Luz::count());
    }

    public function test_ocupacion_y_alertas_reflejan_los_sensores_y_servos(): void
    {
        $this->iniciarSesion();
        $zona = Zona::factory()->create();
        Sensor::factory()->for($zona)->conPresencia(true)->create();
        Sensor::factory()->for($zona)->enFalla()->create(['nombre' => 'PIR roto']);
        Luz::factory()->for($zona)->for(Actuador::factory()->enFalla()->state(['salon_id' => $zona->salon_id]), 'actuador')->create();

        $respuesta = $this->getJson("/api/v1/salones/{$zona->salon_id}/estado")->assertOk();

        $respuesta->assertJsonPath('data.ocupacion', 'ocupado');
        $this->assertEqualsCanonicalizing(
            ['sensor', 'actuador'],
            array_column($respuesta->json('data.alertas'), 'entidad_tipo'),
        );
        $this->assertSame(['error', 'error'], array_column($respuesta->json('data.alertas'), 'nivel'));
    }

    public function test_sensor_en_falla_no_cuenta_como_salon_vacio(): void
    {
        $this->iniciarSesion();
        $zona = Zona::factory()->create();
        Sensor::factory()->for($zona)->enFalla()->create(['presencia' => false]);

        $this->getJson("/api/v1/salones/{$zona->salon_id}/estado")->assertJsonPath('data.ocupacion', 'desconocida');
    }

    public function test_listas_y_detalle_de_zonas_luces_y_sensores(): void
    {
        $salon = $this->iniciarSesionDemo();

        $this->getJson("/api/v1/salones/{$salon->id}/zonas")->assertOk()->assertJsonCount(2, 'data');
        $this->getJson("/api/v1/salones/{$salon->id}/luces")->assertOk()->assertJsonCount(4, 'data')
            ->assertJsonPath('data.0.actuador.conexion', 'activo');
        $this->getJson("/api/v1/salones/{$salon->id}/sensores")->assertOk()->assertJsonCount(2, 'data');

        $sensor = Sensor::first();
        $this->getJson("/api/v1/sensores/{$sensor->id}")->assertOk()->assertJsonPath('data.tipo', 'pir');
        $this->getJson('/api/v1/zonas/'.Zona::first()->id)->assertOk()->assertJsonCount(2, 'data.luces');
    }
}

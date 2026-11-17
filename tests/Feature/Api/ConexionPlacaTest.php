<?php

namespace Tests\Feature\Api;

use App\Models\Actuador;
use App\Models\Salon;
use App\Models\Sensor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** "Conectar placa" en Configurar salón y los números de sensores y servos en la placa. */
class ConexionPlacaTest extends TestCase
{
    use RefreshDatabase;

    private Salon $salon;

    protected function setUp(): void
    {
        parent::setUp();

        $this->salon = $this->iniciarSesionDemo();
    }

    public function test_muestra_estado_direcciones_y_numeros_sin_la_clave(): void
    {
        $this->getJson("/api/v1/salones/{$this->salon->id}/placa")
            ->assertOk()
            ->assertJsonPath('data.placa.configurada', false)
            ->assertJsonPath('data.driver', 'simulado')
            ->assertJsonPath('data.servos.0.numero', 1)
            ->assertJsonPath('data.servos.3.numero', 4)
            ->assertJsonPath('data.sensores.1.numero', 2)
            ->assertJsonStructure(['data' => ['direcciones', 'puerto']])
            ->assertJsonMissingPath('data.clave');

        $this->postJson("/api/v1/salones/{$this->salon->id}/placa/clave")->assertCreated()->assertJsonPath('data.placa.configurada', true);

        $this->getJson("/api/v1/salones/{$this->salon->id}/placa")->assertJsonMissingPath('data.clave');
        $this->assertDatabaseHas('eventos', ['tipo' => 'configuracion', 'mensaje' => 'Clave de la placa generada.']);
    }

    public function test_la_placa_de_otra_cuenta_responde_404(): void
    {
        $this->iniciarSesion();

        $this->getJson("/api/v1/salones/{$this->salon->id}/placa")->assertNotFound();
        $this->postJson("/api/v1/salones/{$this->salon->id}/placa/clave")->assertNotFound();
    }

    public function test_un_sensor_nuevo_recibe_el_primer_numero_libre(): void
    {
        $zona = $this->salon->zonas()->first();
        Sensor::query()->where('numero_en_placa', 1)->delete();

        $this->postJson("/api/v1/zonas/{$zona->id}/sensores", ['nombre' => 'PIR nuevo'])
            ->assertCreated()->assertJsonPath('data.numero_en_placa', 1);
    }

    public function test_cambiar_el_numero_de_un_sensor_lo_intercambia_con_el_otro(): void
    {
        $uno = Sensor::query()->where('numero_en_placa', 1)->first();
        $dos = Sensor::query()->where('numero_en_placa', 2)->first();

        $this->patchJson("/api/v1/sensores/{$uno->id}", ['numero_en_placa' => 2])->assertOk()->assertJsonPath('data.numero_en_placa', 2);

        $this->assertSame(1, $dos->fresh()->numero_en_placa);
        $this->assertSame($uno->nombre, $uno->fresh()->nombre);
        $this->patchJson("/api/v1/sensores/{$uno->id}", ['numero_en_placa' => 99])->assertStatus(400);
    }

    public function test_cambiar_el_servo_de_una_luz_lo_intercambia_con_el_otro(): void
    {
        $servo1 = Actuador::query()->where('numero_en_placa', 1)->first();
        $servo3 = Actuador::query()->where('numero_en_placa', 3)->first();

        $this->patchJson("/api/v1/luces/{$servo1->luz->id}", ['numero_servo' => 3])
            ->assertOk()->assertJsonPath('data.actuador.numero_en_placa', 3);

        $this->assertSame(1, $servo3->fresh()->numero_en_placa);
    }
}

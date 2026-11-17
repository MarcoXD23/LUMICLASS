<?php

namespace Tests\Feature\Api;

use App\Drivers\ClienteEsp32;
use App\Enums\EstadoLuz;
use App\Models\Luz;
use App\Models\User;
use App\Models\Zona;
use App\Servicios\ServicioTick;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

/** Cada luz puede tener su ESP32 (por IP): se configura, se prueba, se acciona y se sincroniza. */
class Esp32Test extends TestCase
{
    use RefreshDatabase;

    private Luz $luz;

    protected function setUp(): void
    {
        parent::setUp();

        $this->iniciarSesion();
        $this->luz = Luz::factory()->for(Zona::factory()->manual())->create(['estado_real' => EstadoLuz::Apagada]);
    }

    private function guardar(?string $direccion)
    {
        return $this->patchJson("/api/v1/actuadores/{$this->luz->actuador_id}/esp32", ['direccion' => $direccion]);
    }

    private function encender()
    {
        return $this->postJson("/api/v1/luces/{$this->luz->id}/comando", ['accion' => 'encender', 'id_solicitud' => (string) Str::uuid()]);
    }

    public function test_normaliza_la_direccion_escrita_de_varias_formas(): void
    {
        $this->assertSame('http://192.168.18.187', ClienteEsp32::normalizar('192.168.18.187'));
        $this->assertSame('http://192.168.18.187', ClienteEsp32::normalizar('http:192.168.18.187'));
        $this->assertSame('http://192.168.18.187', ClienteEsp32::normalizar(' http://192.168.18.187/ '));
        $this->assertSame('http://bombillo.local:8080', ClienteEsp32::normalizar('Bombillo.local:8080'));
        $this->assertNull(ClienteEsp32::normalizar('192.168.18.187/on'));
        $this->assertNull(ClienteEsp32::normalizar('usuario@192.168.18.187'));
        $this->assertNull(ClienteEsp32::normalizar('192.168.18.187:99999'));
    }

    public function test_guardar_la_ip_prueba_la_conexion_y_trae_el_estado_del_rele(): void
    {
        Http::fake(['192.168.18.187/estado' => Http::response(['on' => true])]);

        $this->guardar('http:192.168.18.187')->assertOk()
            ->assertJsonPath('data.direccion', 'http://192.168.18.187')
            ->assertJsonPath('data.tipo', 'esp32')
            ->assertJsonPath('data.conexion', 'activo')
            ->assertJsonPath('prueba.conectado', true)
            ->assertJsonPath('prueba.encendido', true);

        $this->assertSame(EstadoLuz::Encendida, $this->luz->fresh()->estado_real);
        $this->assertDatabaseHas('eventos', ['tipo' => 'configuracion']);
    }

    public function test_ip_invalida_o_repetida_en_el_salon_se_rechaza(): void
    {
        $this->guardar('no es una ip')->assertStatus(400)->assertJsonValidationErrors('direccion', 'error.detalles');

        Http::fake(['*' => Http::response(['on' => false])]);
        $otra = Luz::factory()->for($this->luz->zona)->create();
        $otra->actuador->update(['direccion' => 'http://192.168.18.187', 'salon_id' => $this->luz->actuador->salon_id]);

        $this->guardar('192.168.18.187')->assertStatus(400)->assertJsonValidationErrors('direccion', 'error.detalles');
    }

    public function test_esp32_apagado_queda_inactivo_con_alerta_y_no_se_puede_accionar(): void
    {
        Http::fake(fn () => throw new ConnectionException('timeout'));

        $this->guardar('192.168.18.187')->assertOk()
            ->assertJsonPath('prueba.conectado', false)
            ->assertJsonPath('data.conexion', 'inactivo');

        $this->getJson("/api/v1/salones/{$this->luz->zona->salon_id}/estado")
            ->assertJsonFragment(['mensaje' => "El ESP32 de la luz \"{$this->luz->nombre}\" (http://192.168.18.187) no responde."]);
        $this->encender()->assertStatus(409);
    }

    public function test_la_orden_va_al_esp32_de_la_luz_aunque_el_driver_sea_simulado(): void
    {
        Http::fake([
            '192.168.18.187/estado' => Http::response(['on' => false]),
            '192.168.18.187/on' => Http::response(['on' => true]),
        ]);
        $this->guardar('192.168.18.187')->assertOk();

        $this->encender()->assertOk()->assertJsonPath('resultado', 'completada')->assertJsonPath('data.estado_real', 'encendida');
        Http::assertSent(fn ($peticion) => $peticion->url() === 'http://192.168.18.187/on');
    }

    public function test_el_tick_detecta_un_cambio_hecho_desde_la_pagina_del_esp32(): void
    {
        $this->luz->actuador->update(['direccion' => 'http://192.168.18.187']);
        Http::fake(['192.168.18.187/estado' => Http::response(['on' => true])]);

        app(ServicioTick::class)->ejecutar();

        $this->assertSame(EstadoLuz::Encendida, $this->luz->fresh()->estado_real);
        $this->assertDatabaseHas('eventos', ['tipo' => 'luz.interruptor', 'origen' => 'sistema']);
    }

    public function test_el_tick_marca_inactivo_y_luego_recupera_la_conexion(): void
    {
        config(['lumiclass.esp32.segundos_sincronizar' => 1]);
        $this->luz->actuador->update(['direccion' => 'http://192.168.18.187']);
        $responde = false;
        Http::fake(function () use (&$responde) {
            if (! $responde) {
                throw new ConnectionException('timeout');
            }

            return Http::response(['on' => false]);
        });

        app(ServicioTick::class)->ejecutar();
        $this->assertSame('inactivo', $this->luz->actuador->fresh()->conexion->value);

        $responde = true;
        $this->travel(2)->seconds();
        app(ServicioTick::class)->ejecutar();
        $this->assertSame('activo', $this->luz->actuador->fresh()->conexion->value);
    }

    public function test_quitar_la_ip_vuelve_al_simulador(): void
    {
        Http::fake(['*' => Http::response(['on' => false])]);
        $this->guardar('192.168.18.187')->assertOk();

        $this->guardar(null)->assertOk()->assertJsonPath('data.direccion', null)->assertJsonPath('data.tipo', 'simulado');
        Http::fake(fn () => $this->fail('Sin ESP32 no debe llamar por HTTP.'));
        $this->encender()->assertOk()->assertJsonPath('resultado', 'completada');
    }

    public function test_probar_sin_ip_se_rechaza_y_otra_cuenta_no_ve_el_esp32(): void
    {
        $this->postJson("/api/v1/actuadores/{$this->luz->actuador_id}/esp32/probar")->assertStatus(409);

        $this->actingAs(User::factory()->create());
        $this->guardar('192.168.18.187')->assertNotFound();
    }
}

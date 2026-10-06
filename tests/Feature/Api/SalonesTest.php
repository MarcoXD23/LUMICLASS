<?php

namespace Tests\Feature\Api;

use App\Http\Controllers\Api\SalonController;
use App\Models\Actuador;
use App\Models\Evento;
use App\Models\Luz;
use App\Models\Regla;
use App\Models\Salon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SalonesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->iniciarSesion();
    }

    public function test_crear_salon_con_la_estructura_por_defecto(): void
    {
        $id = $this->postJson('/api/v1/salones', ['nombre' => 'Aula 204'])
            ->assertCreated()
            ->assertJsonPath('data.nombre', 'Aula 204')
            ->assertJsonPath('data.zonas', 2)
            ->assertJsonPath('data.luces', 4)
            ->json('data.id');

        $salon = Salon::findOrFail($id);
        $this->assertSame(4, $salon->actuadores()->count());
        $this->assertSame(2, $salon->sensores()->count());
        $this->assertSame(2, $salon->reglas()->count());
    }

    public function test_crear_salon_con_cantidades_propias(): void
    {
        $this->postJson('/api/v1/salones', ['nombre' => 'Laboratorio', 'zonas' => 3, 'luces_por_zona' => 1])
            ->assertCreated()
            ->assertJsonPath('data.zonas', 3)
            ->assertJsonPath('data.luces', 3);

        $this->postJson('/api/v1/salones', ['nombre' => 'Gigante', 'zonas' => 11, 'luces_por_zona' => 0])
            ->assertStatus(400)
            ->assertJsonValidationErrors(['zonas', 'luces_por_zona'], 'error.detalles');
    }

    public function test_el_nombre_no_se_repite_en_la_misma_cuenta(): void
    {
        $this->postJson('/api/v1/salones', ['nombre' => 'Aula 1'])->assertCreated();
        $this->postJson('/api/v1/salones', ['nombre' => 'Aula 1'])
            ->assertStatus(400)
            ->assertJsonValidationErrors(['nombre'], 'error.detalles');
    }

    public function test_listar_renombrar_y_ver(): void
    {
        $salon = Salon::factory()->create(['nombre' => 'Viejo']);

        $this->getJson('/api/v1/salones')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.nombre', 'Viejo');
        $this->patchJson("/api/v1/salones/{$salon->id}", ['nombre' => 'Nuevo'])->assertOk()->assertJsonPath('data.nombre', 'Nuevo');
        // Renombrar con su mismo nombre no choca consigo mismo.
        $this->patchJson("/api/v1/salones/{$salon->id}", ['nombre' => 'Nuevo'])->assertOk();
        $this->getJson("/api/v1/salones/{$salon->id}")->assertOk()->assertJsonPath('data.nombre', 'Nuevo');
    }

    public function test_borrar_salon_borra_todo_lo_suyo(): void
    {
        $id = $this->postJson('/api/v1/salones', ['nombre' => 'Temporal'])->json('data.id');
        $this->postJson("/api/v1/salones/{$id}/sim/presencia", ['presencia' => true])->assertOk();

        $this->deleteJson("/api/v1/salones/{$id}")->assertNoContent();

        $this->assertSame(0, Luz::count());
        $this->assertSame(0, Actuador::count());
        $this->assertSame(0, Regla::count());
        $this->assertSame(0, Evento::count());
        $this->getJson("/api/v1/salones/{$id}")->assertNotFound();
    }

    public function test_limite_de_salones_por_cuenta(): void
    {
        Salon::factory()->count(SalonController::MAXIMO_POR_CUENTA)->create();

        $this->postJson('/api/v1/salones', ['nombre' => 'Uno más'])
            ->assertStatus(409)
            ->assertJsonPath('error.codigo', 'limite_salones');
    }
}

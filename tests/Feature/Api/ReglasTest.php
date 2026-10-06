<?php

namespace Tests\Feature\Api;

use App\Models\Evento;
use App\Models\Regla;
use App\Models\Salon;
use App\Models\Zona;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReglasTest extends TestCase
{
    use RefreshDatabase;

    private Salon $salon;

    protected function setUp(): void
    {
        parent::setUp();

        $this->iniciarSesion();
        $this->salon = Salon::factory()->create();
    }

    private function reglaValida(array $cambios = []): array
    {
        return array_replace([
            'nombre' => 'Apagar sin presencia',
            'activa' => true,
            'prioridad' => 20,
            'zona_id' => null,
            'condicion' => ['presencia' => 'vacio', 'duracion_segundos' => 300],
            'accion' => ['accion' => 'apagar'],
        ], $cambios);
    }

    public function test_crear_listar_actualizar_y_eliminar(): void
    {
        $id = $this->postJson("/api/v1/salones/{$this->salon->id}/reglas", $this->reglaValida())
            ->assertCreated()
            ->assertJsonPath('data.condicion.duracion_segundos', 300)
            ->json('data.id');

        Regla::factory()->for($this->salon)->create(['prioridad' => 5, 'nombre' => 'Primera']);
        $this->getJson("/api/v1/salones/{$this->salon->id}/reglas")->assertOk()->assertJsonPath('data.0.nombre', 'Primera');

        $this->putJson("/api/v1/reglas/{$id}", $this->reglaValida(['activa' => false]))
            ->assertOk()
            ->assertJsonPath('data.activa', false);

        $this->deleteJson("/api/v1/reglas/{$id}")->assertNoContent();
        $this->getJson("/api/v1/reglas/{$id}")->assertNotFound()->assertJsonPath('error.codigo', 'no_encontrado');

        $this->assertSame(
            ['regla.creada', 'regla.actualizada', 'regla.eliminada'],
            Evento::orderBy('id')->pluck('tipo')->map->value->all(),
        );
        $this->assertSame(3, $this->salon->eventos()->count());
    }

    public function test_regla_por_zona_del_mismo_salon(): void
    {
        $zona = Zona::factory()->for($this->salon)->create();

        $this->postJson("/api/v1/salones/{$this->salon->id}/reglas", $this->reglaValida(['zona_id' => $zona->id]))
            ->assertCreated()
            ->assertJsonPath('data.zona_id', $zona->id);
    }

    public function test_no_acepta_una_zona_de_otro_salon(): void
    {
        $zonaDeOtroSalon = Zona::factory()->create();

        $this->postJson("/api/v1/salones/{$this->salon->id}/reglas", $this->reglaValida(['zona_id' => $zonaDeOtroSalon->id]))
            ->assertStatus(400)
            ->assertJsonValidationErrors(['zona_id'], 'error.detalles');
    }

    public function test_rechaza_condiciones_y_acciones_invalidas(): void
    {
        $this->postJson("/api/v1/salones/{$this->salon->id}/reglas", $this->reglaValida([
            'condicion' => ['presencia' => 'tal_vez', 'hackeo' => 1],
            'accion' => ['accion' => 'explotar'],
            'prioridad' => 0,
            'zona_id' => 999,
        ]))
            ->assertStatus(400)
            ->assertJsonValidationErrors(
                ['condicion', 'condicion.presencia', 'accion.accion', 'prioridad', 'zona_id'],
                'error.detalles',
            );

        $this->assertSame(0, Regla::count());
    }

    public function test_rechaza_duracion_negativa(): void
    {
        $this->postJson("/api/v1/salones/{$this->salon->id}/reglas", $this->reglaValida(['condicion' => ['presencia' => 'vacio', 'duracion_segundos' => -5]]))
            ->assertStatus(400)
            ->assertJsonValidationErrors(['condicion.duracion_segundos'], 'error.detalles');
    }
}

<?php

namespace Tests\Feature\Api;

use App\Models\Evento;
use App\Models\Regla;
use App\Models\Zona;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReglasTest extends TestCase
{
    use RefreshDatabase;

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
        $id = $this->postJson('/api/v1/reglas', $this->reglaValida())
            ->assertCreated()
            ->assertJsonPath('data.condicion.duracion_segundos', 300)
            ->json('data.id');

        Regla::factory()->create(['prioridad' => 5, 'nombre' => 'Primera']);
        $this->getJson('/api/v1/reglas')->assertOk()->assertJsonPath('data.0.nombre', 'Primera');

        $this->putJson("/api/v1/reglas/{$id}", $this->reglaValida(['activa' => false]))
            ->assertOk()
            ->assertJsonPath('data.activa', false);

        $this->deleteJson("/api/v1/reglas/{$id}")->assertNoContent();
        $this->getJson("/api/v1/reglas/{$id}")->assertNotFound()->assertJsonPath('error.codigo', 'no_encontrado');

        $this->assertSame(
            ['regla.creada', 'regla.actualizada', 'regla.eliminada'],
            Evento::orderBy('id')->pluck('tipo')->map->value->all(),
        );
    }

    public function test_regla_por_zona(): void
    {
        $zona = Zona::factory()->create();

        $this->postJson('/api/v1/reglas', $this->reglaValida(['zona_id' => $zona->id]))
            ->assertCreated()
            ->assertJsonPath('data.zona_id', $zona->id);
    }

    public function test_rechaza_condiciones_y_acciones_invalidas(): void
    {
        $this->postJson('/api/v1/reglas', $this->reglaValida([
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
        $this->postJson('/api/v1/reglas', $this->reglaValida(['condicion' => ['presencia' => 'vacio', 'duracion_segundos' => -5]]))
            ->assertStatus(400)
            ->assertJsonValidationErrors(['condicion.duracion_segundos'], 'error.detalles');
    }
}

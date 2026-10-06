<?php

namespace Tests\Feature\Api;

use App\Enums\ModoZona;
use App\Models\Evento;
use App\Models\Zona;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ZonaModoTest extends TestCase
{
    use RefreshDatabase;

    public function test_cambiar_modo_registra_evento(): void
    {
        $zona = Zona::factory()->create();

        $this->patchJson("/api/v1/zonas/{$zona->id}/modo", ['modo' => 'manual'])
            ->assertOk()
            ->assertJsonPath('cambio', true)
            ->assertJsonPath('data.modo', 'manual');

        $this->assertSame(ModoZona::Manual, $zona->fresh()->modo);
        $this->assertSame(1, Evento::where('tipo', 'zona.modo')->count());
    }

    public function test_pedir_el_mismo_modo_no_genera_evento(): void
    {
        $zona = Zona::factory()->create();

        $this->patchJson("/api/v1/zonas/{$zona->id}/modo", ['modo' => 'automatico'])
            ->assertOk()
            ->assertJsonPath('cambio', false);

        $this->assertSame(0, Evento::count());
    }

    public function test_modo_invalido_responde_400(): void
    {
        $zona = Zona::factory()->create();

        $this->patchJson("/api/v1/zonas/{$zona->id}/modo", ['modo' => 'turbo'])
            ->assertStatus(400)
            ->assertJsonPath('error.codigo', 'datos_invalidos');
    }
}

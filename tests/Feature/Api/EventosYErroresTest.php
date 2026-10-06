<?php

namespace Tests\Feature\Api;

use App\Enums\OrigenEvento;
use App\Enums\SeveridadEvento;
use App\Enums\TipoEvento;
use App\Servicios\RegistroEventos;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class EventosYErroresTest extends TestCase
{
    use RefreshDatabase;

    private function registrar(TipoEvento $tipo, SeveridadEvento $severidad = SeveridadEvento::Info): void
    {
        app(RegistroEventos::class)->registrar($tipo, OrigenEvento::Sistema, 'Evento de prueba', null, [], $severidad);
    }

    public function test_historial_paginado_del_mas_reciente_al_mas_antiguo(): void
    {
        foreach (range(1, 3) as $_) {
            $this->registrar(TipoEvento::LuzComando);
        }

        $this->getJson('/api/v1/eventos?por_pagina=2')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', 3)
            ->assertJsonPath('meta.total', 3);
    }

    public function test_filtra_por_tipo_severidad_y_fecha(): void
    {
        Carbon::setTestNow('2026-10-01 10:00:00');
        $this->registrar(TipoEvento::LuzComando);
        Carbon::setTestNow('2026-10-05 10:00:00');
        $this->registrar(TipoEvento::ComandoRechazado, SeveridadEvento::Advertencia);
        Carbon::setTestNow();

        $this->getJson('/api/v1/eventos?tipo=comando.rechazado')->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/eventos?severidad=advertencia')->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/eventos?desde=2026-10-02&hasta=2026-10-06')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.tipo', 'comando.rechazado');
    }

    public function test_filtros_invalidos_responden_400(): void
    {
        $this->getJson('/api/v1/eventos?tipo=inventado&desde=2026-10-06&hasta=2026-10-01&por_pagina=500')
            ->assertStatus(400)
            ->assertJsonValidationErrors(['tipo', 'hasta', 'por_pagina'], 'error.detalles');
    }

    public function test_recurso_inexistente_e_id_no_numerico_responden_404(): void
    {
        $this->getJson('/api/v1/luces/999')->assertNotFound()->assertJsonPath('error.codigo', 'no_encontrado');
        $this->getJson('/api/v1/luces/abc')->assertNotFound()->assertJsonPath('error.codigo', 'no_encontrado');
        $this->getJson('/api/v1/no-existe')->assertNotFound();
    }

    public function test_metodo_no_permitido_responde_405(): void
    {
        $this->deleteJson('/api/v1/salud')->assertStatus(405)->assertJsonPath('error.codigo', 'metodo_no_permitido');
    }

    public function test_json_mal_formado_responde_400(): void
    {
        $this->call('POST', '/api/v1/reglas', [], [], [], ['CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json'], '{nombre: roto')
            ->assertStatus(400)
            ->assertJsonPath('error.codigo', 'datos_invalidos');
    }
}

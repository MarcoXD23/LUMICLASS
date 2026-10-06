<?php

namespace Tests\Feature\Api;

use App\Enums\OrigenEvento;
use App\Enums\SeveridadEvento;
use App\Enums\TipoEvento;
use App\Models\Salon;
use App\Servicios\RegistroEventos;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class EventosYErroresTest extends TestCase
{
    use RefreshDatabase;

    private Salon $salon;

    protected function setUp(): void
    {
        parent::setUp();

        $this->iniciarSesion();
        $this->salon = Salon::factory()->create();
    }

    private function registrar(TipoEvento $tipo, SeveridadEvento $severidad = SeveridadEvento::Info): void
    {
        app(RegistroEventos::class)->registrar($tipo, OrigenEvento::Sistema, 'Evento de prueba', null, [], $severidad, $this->salon);
    }

    private function eventos(string $filtros = ''): string
    {
        return "/api/v1/salones/{$this->salon->id}/eventos{$filtros}";
    }

    public function test_historial_paginado_del_mas_reciente_al_mas_antiguo(): void
    {
        foreach (range(1, 3) as $_) {
            $this->registrar(TipoEvento::LuzComando);
        }

        // El más reciente es el de id mayor (en MySQL los ids no vuelven a empezar en 1 entre pruebas).
        $this->getJson($this->eventos('?por_pagina=2'))
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $this->salon->eventos()->max('id'))
            ->assertJsonPath('meta.total', 3);
    }

    public function test_filtra_por_tipo_severidad_y_fecha(): void
    {
        Carbon::setTestNow('2026-10-01 10:00:00');
        $this->registrar(TipoEvento::LuzComando);
        Carbon::setTestNow('2026-10-05 10:00:00');
        $this->registrar(TipoEvento::ComandoRechazado, SeveridadEvento::Advertencia);
        Carbon::setTestNow();

        $this->getJson($this->eventos('?tipo=comando.rechazado'))->assertJsonCount(1, 'data');
        $this->getJson($this->eventos('?severidad=advertencia'))->assertJsonCount(1, 'data');
        $this->getJson($this->eventos('?desde=2026-10-02&hasta=2026-10-06'))
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.tipo', 'comando.rechazado');
    }

    public function test_csv_con_los_filtros_aplicados(): void
    {
        $this->registrar(TipoEvento::LuzComando);
        $this->registrar(TipoEvento::ActuadorFalla, SeveridadEvento::Error);

        $respuesta = $this->get("/api/v1/salones/{$this->salon->id}/eventos.csv?severidad=error")->assertOk();

        $this->assertStringContainsString('text/csv', $respuesta->headers->get('Content-Type'));
        $this->assertStringContainsString('attachment; filename=historial-', $respuesta->headers->get('Content-Disposition'));

        $lineas = array_values(array_filter(explode("\n", $respuesta->streamedContent())));
        $this->assertStringStartsWith("\xEF\xBB\xBFfecha_utc;tipo;origen;severidad;mensaje", $lineas[0]);
        $this->assertCount(2, $lineas);
        $this->assertStringContainsString('actuador.falla;sistema;error;"Evento de prueba"', $lineas[1]);
    }

    public function test_csv_de_otra_cuenta_responde_404(): void
    {
        $this->iniciarSesion();

        $this->getJson("/api/v1/salones/{$this->salon->id}/eventos.csv")->assertNotFound();
    }

    public function test_las_fechas_del_filtro_son_dias_de_la_hora_local(): void
    {
        // 03:00 UTC del 6 = 22:00 del 5 en Bogotá (UTC-5).
        Carbon::setTestNow('2026-10-06 03:00:00');
        $this->registrar(TipoEvento::LuzComando);
        Carbon::setTestNow();

        $this->getJson($this->eventos('?desde=2026-10-05&hasta=2026-10-05&zona_horaria=America/Bogota'))->assertJsonCount(1, 'data');
        $this->getJson($this->eventos('?desde=2026-10-06&hasta=2026-10-06&zona_horaria=America/Bogota'))->assertJsonCount(0, 'data');
        // Sin zona horaria se usa la del servidor (UTC): cae el día 6.
        $this->getJson($this->eventos('?desde=2026-10-06&hasta=2026-10-06'))->assertJsonCount(1, 'data');
    }

    public function test_filtros_invalidos_responden_400(): void
    {
        $this->getJson($this->eventos('?tipo=inventado&desde=2026-10-06&hasta=2026-10-01&por_pagina=500'))
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
        $this->call('POST', "/api/v1/salones/{$this->salon->id}/reglas", [], [], [], ['CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json'], '{nombre: roto')
            ->assertStatus(400)
            ->assertJsonPath('error.codigo', 'datos_invalidos');
    }
}

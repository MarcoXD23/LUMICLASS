<?php

namespace Tests\Feature\Api;

use App\Enums\EstadoLuz;
use App\Models\Evento;
use App\Models\Salon;
use App\Models\SolicitudProcesada;
use App\Servicios\CreadorSalon;
use App\Servicios\MotorReglas;
use App\Servicios\ServicioTick;
use App\Servicios\SolicitudesUnicas;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;
use Tests\TestCase;

/** Regla 6 del proyecto: no romperse ante datos inválidos, duplicados, carreras o fallas internas. */
class RobustezTest extends TestCase
{
    use RefreshDatabase;

    private Salon $salon;

    protected function setUp(): void
    {
        parent::setUp();

        $this->salon = app(CreadorSalon::class)->crearEjemplo($this->iniciarSesion());
    }

    private function ordenar(int $luzId, string $accion, string $id)
    {
        return $this->postJson("/api/v1/luces/{$luzId}/comando", ['accion' => $accion, 'id_solicitud' => $id]);
    }

    public function test_el_mismo_id_solicitud_con_otra_accion_se_rechaza_en_vez_de_fingir_que_se_hizo(): void
    {
        $luz = $this->salon->luces()->first();
        $id = (string) Str::uuid();

        $this->ordenar($luz->id, 'encender', $id)->assertOk();
        $this->ordenar($luz->id, 'apagar', $id)
            ->assertStatus(409)
            ->assertJsonPath('error.codigo', 'id_solicitud_reutilizado');

        $this->assertSame(EstadoLuz::Encendida, $luz->fresh()->estado_real);
    }

    public function test_dos_peticiones_identicas_que_terminan_a_la_vez_responden_lo_mismo(): void
    {
        // Simula la carrera: mientras esta petición trabaja, "otra" idéntica guarda su resultado primero.
        $id = (string) Str::uuid();
        $request = Request::create('/api/v1/luces/1/comando', 'POST', ['accion' => 'encender', 'id_solicitud' => $id]);
        $request->setUserResolver(fn () => auth()->user());
        $unicas = app(SolicitudesUnicas::class);

        $respuesta = $unicas->ejecutarUnaVez($request, $id, function () use ($unicas, $request, $id) {
            $unicas->ejecutarUnaVez($request, $id, fn () => response()->json(['gano' => 'la otra']));

            return response()->json(['gano' => 'esta']);
        });

        $this->assertSame(['gano' => 'la otra'], $respuesta->getData(true));
        $this->assertSame('true', $respuesta->headers->get('X-Solicitud-Repetida'));
        $this->assertSame(1, SolicitudProcesada::count());
    }

    public function test_dos_ticks_a_la_vez_no_procesan_lo_mismo(): void
    {
        $candado = Cache::lock('lumiclass.tick', 30);
        $candado->get();

        $this->assertTrue(app(ServicioTick::class)->ejecutar()['omitido']);

        $candado->release();
        $this->assertFalse(app(ServicioTick::class)->ejecutar()['omitido']);
    }

    public function test_si_el_tick_falla_el_dashboard_igual_responde(): void
    {
        $this->mock(MotorReglas::class, fn ($m) => $m->shouldReceive('evaluarTodas')->andThrow(new RuntimeException('falla interna')));

        $this->getJson("/api/v1/salones/{$this->salon->id}/estado")->assertOk()->assertJsonPath('data.luces.total', 4);
    }

    public function test_textos_demasiado_largos_se_rechazan(): void
    {
        $this->postJson('/api/v1/salones', ['nombre' => str_repeat('a', 101)])
            ->assertStatus(400)->assertJsonValidationErrors(['nombre'], 'error.detalles');

        $this->postJson("/api/v1/salones/{$this->salon->id}/reglas", [
            'nombre' => str_repeat('x', 10000), 'activa' => true, 'prioridad' => 1,
            'condicion' => ['presencia' => 'ocupado'], 'accion' => ['accion' => 'encender'],
        ])->assertStatus(400)->assertJsonValidationErrors(['nombre'], 'error.detalles');
    }

    public function test_tipos_incorrectos_no_provocan_error_500(): void
    {
        $luz = $this->salon->luces()->first();

        foreach ([
            ['accion' => ['encender'], 'id_solicitud' => (string) Str::uuid()],
            ['accion' => 123, 'id_solicitud' => ['no', 'es', 'texto']],
            ['accion' => null, 'id_solicitud' => null],
        ] as $cuerpo) {
            $this->postJson("/api/v1/luces/{$luz->id}/comando", $cuerpo)->assertStatus(400);
        }

        $this->postJson("/api/v1/salones/{$this->salon->id}/reglas", ['condicion' => 'ocupado', 'accion' => 'encender'])
            ->assertStatus(400);
        $this->getJson("/api/v1/salones/{$this->salon->id}/eventos?por_pagina[]=1&desde=ayer")->assertStatus(400);
    }

    public function test_el_estado_del_salon_no_hace_mas_consultas_con_mas_luces(): void
    {
        // Sin el tick (se mide solo el armado del dashboard).
        Cache::put('lumiclass.tick.reciente', true, 60);
        $grande = app(CreadorSalon::class)->crear(auth()->user(), 'Auditorio', 10, 10);

        $contar = function (Salon $salon): int {
            DB::flushQueryLog();
            DB::enableQueryLog();
            $this->getJson("/api/v1/salones/{$salon->id}/estado")->assertOk();
            DB::disableQueryLog();

            return count(DB::getQueryLog());
        };

        $pequeno = $contar($this->salon);
        $this->assertSame($pequeno, $contar($grande), 'El número de consultas crece con las luces (N+1).');
        $this->assertLessThan(15, $pequeno);
    }

    public function test_los_mensajes_del_historial_largos_se_recortan(): void
    {
        $luz = $this->salon->luces()->first();
        $luz->update(['nombre' => str_repeat('N', 100)]);
        $this->salon->actuadores()->update(['nombre' => str_repeat('S', 100)]);
        $this->patchJson("/api/v1/sim/actuadores/{$luz->actuador_id}", ['respuesta' => 'falla'])->assertOk();

        $this->ordenar($luz->id, 'encender', (string) Str::uuid())->assertOk();

        $this->assertLessThanOrEqual(253, Evento::max(DB::raw('length(mensaje)')));
    }
}

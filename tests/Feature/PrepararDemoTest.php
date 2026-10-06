<?php

namespace Tests\Feature;

use App\Models\CambioLuz;
use App\Models\Evento;
use App\Models\User;
use App\Servicios\CreadorSalon;
use Database\Seeders\SalonDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class PrepararDemoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-10-06 15:00:00');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_crea_la_cuenta_demo_si_no_existe_y_llena_las_estadisticas(): void
    {
        $this->artisan('lumiclass:demo', ['--zona-horaria' => 'America/Bogota'])->assertSuccessful();

        $demo = User::where('email', SalonDemoSeeder::CORREO)->firstOrFail();
        $salon = $demo->salones()->firstOrFail();
        $this->iniciarSesion($demo);

        $datos = $this->getJson("/api/v1/salones/{$salon->id}/estadisticas?rango=7d&zona_horaria=America/Bogota")->assertOk()->json('data');

        $this->assertGreaterThan(0, $datos['totales']['segundos_encendidas']);
        $this->assertGreaterThan(0, $datos['totales']['segundos_ocupado']);
        $this->assertGreaterThan(0, $datos['totales']['segundos_desperdicio']);
        // Seis días pasados con clases; hoy, recién reiniciado, sin horas todavía.
        $this->assertSame(6, collect($datos['por_dia'])->where('segundos_encendidas', '>', 0)->count());
    }

    public function test_queda_marcado_como_datos_de_ejemplo_y_el_simulador_reiniciado(): void
    {
        $this->artisan('lumiclass:demo')->assertSuccessful();

        $salon = User::where('email', SalonDemoSeeder::CORREO)->firstOrFail()->salones()->firstOrFail();
        $this->assertSame(1, $salon->eventos()->where('tipo', 'demo.preparada')->count());
        $this->assertSame(4, $salon->luces()->where('estado_real', 'apagada')->count());
        $this->assertSame(0, $salon->sensores()->whereNotNull('presencia')->count());
    }

    public function test_no_toca_ninguna_otra_cuenta(): void
    {
        $otra = app(CreadorSalon::class)->crearEjemplo(User::factory()->create());
        $otra->luces()->first()->update(['estado_real' => 'encendida']);
        $antesLuz = CambioLuz::whereIn('luz_id', $otra->luces()->pluck('luces.id'))->count();
        $antesEventos = Evento::where('salon_id', $otra->id)->count();

        $this->artisan('lumiclass:demo')->assertSuccessful();

        $this->assertSame($antesLuz, CambioLuz::whereIn('luz_id', $otra->luces()->pluck('luces.id'))->count());
        $this->assertSame($antesEventos, Evento::where('salon_id', $otra->id)->count());
        $this->assertSame('encendida', $otra->luces()->first()->estado_real->value);
    }

    public function test_se_puede_repetir_y_da_lo_mismo(): void
    {
        $this->artisan('lumiclass:demo')->assertSuccessful();
        $primera = CambioLuz::count();

        $this->artisan('lumiclass:demo')->assertSuccessful();

        $this->assertSame($primera, CambioLuz::count());
        $this->assertSame(1, User::where('email', SalonDemoSeeder::CORREO)->count());
    }

    public function test_valida_las_opciones(): void
    {
        $this->artisan('lumiclass:demo', ['--dias' => 99])->assertExitCode(2);
        $this->artisan('lumiclass:demo', ['--zona-horaria' => 'Marte/Base'])->assertExitCode(2);
    }
}

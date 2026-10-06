<?php

namespace Tests\Feature\Web;

use App\Models\User;
use App\Servicios\CreadorSalon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaginasTest extends TestCase
{
    use RefreshDatabase;

    private const PAGINAS_DE_SALON = ['', '/control', '/sensores', '/reglas', '/historial', '/estadisticas', '/simulador'];

    public function test_sin_sesion_todo_lleva_a_ingresar(): void
    {
        $this->get('/')->assertRedirect('/ingresar');
        $this->get('/salones')->assertRedirect('/ingresar');
        $this->get('/salones/1/control')->assertRedirect('/ingresar');
    }

    public function test_ingresar_y_registro_se_muestran_en_espanol(): void
    {
        $this->get('/ingresar')->assertOk()->assertSee('Ingresar')->assertSee('lang="es"', false)->assertSee('Regístrate');
        $this->get('/registro')->assertOk()->assertSee('Crear cuenta')->assertSee('mínimo 8 caracteres');
    }

    public function test_con_sesion_ingresar_lleva_a_mis_salones(): void
    {
        $this->actingAs(User::factory()->create());

        $this->get('/')->assertRedirect('/salones');
        $this->get('/ingresar')->assertRedirect('/salones');
        $this->get('/salones')->assertOk()->assertSee('Mis salones');
    }

    public function test_el_dueno_ve_todas_las_paginas_de_su_salon(): void
    {
        $usuario = User::factory()->create();
        $salon = app(CreadorSalon::class)->crearEjemplo($usuario, 'Aula Magna');
        $this->actingAs($usuario);

        foreach (self::PAGINAS_DE_SALON as $pagina) {
            $this->get("/salones/{$salon->id}{$pagina}")
                ->assertOk()
                ->assertSee('Aula Magna')
                ->assertSee('aria-current="page"', false);
        }
    }

    public function test_otra_cuenta_recibe_404_en_las_paginas_de_un_salon_ajeno(): void
    {
        $salonAjeno = app(CreadorSalon::class)->crearEjemplo(User::factory()->create());
        $this->actingAs(User::factory()->create());

        foreach (self::PAGINAS_DE_SALON as $pagina) {
            $this->get("/salones/{$salonAjeno->id}{$pagina}")->assertNotFound();
        }
    }

    public function test_paginas_de_error_en_espanol(): void
    {
        $this->actingAs(User::factory()->create());

        $this->get('/salones/999')->assertNotFound()->assertSee('Página no encontrada')->assertSee('lang="es"', false);
        $this->get('/no-existe')->assertNotFound()->assertSee('no pertenece a tu cuenta');
    }

    public function test_con_driver_real_no_hay_simulador(): void
    {
        config(['lumiclass.driver' => 'real']);
        $usuario = User::factory()->create();
        $salon = app(CreadorSalon::class)->crearEjemplo($usuario);
        $this->actingAs($usuario);

        $this->get("/salones/{$salon->id}")->assertOk()->assertDontSee('/simulador');
        $this->get("/salones/{$salon->id}/simulador")->assertNotFound();
    }
}

<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

/** La interfaz es en español: ningún mensaje de validación puede salir en inglés. */
class MensajesEnEspanolTest extends TestCase
{
    use RefreshDatabase;

    public function test_cada_regla_usada_en_el_proyecto_tiene_su_mensaje_en_espanol(): void
    {
        $traducidas = array_keys(require lang_path('es/validation.php'));
        $usadas = collect(File::allFiles(app_path('Http/Requests')))
            // Solo reglas ('required', 'max:100'); no nombres de campo ('password' => ...) ni argumentos (validated('password')).
            ->flatMap(fn ($archivo) => preg_match_all("/(?<!\()'([a-z_]+)(?::[^']*)?'(?!\s*=>)/", $archivo->getContents(), $m) ? $m[1] : [])
            ->merge(['unique', 'exists', 'in', 'enum']) // las que se escriben con Rule::unique(), Rule::in(), etc.
            ->unique()
            ->filter(fn ($regla) => in_array($regla, $this->reglasDeLaravel(), true))
            ->values();

        $this->assertSame([], $usadas->diff($traducidas)->values()->all(), 'Reglas sin mensaje en lang/es/validation.php');
    }

    public function test_registro_con_errores_responde_en_espanol(): void
    {
        User::factory()->create(['email' => 'ana@ejemplo.com']);

        $detalles = $this->postJson('/api/v1/auth/registro', [
            'nombre' => 'Ana', 'email' => 'ANA@ejemplo.com', 'password' => 'secreta123', 'password_confirmation' => 'otra-cosa',
        ])->assertStatus(400)->json('error.detalles');

        $this->assertSame('Ese correo ya está en uso.', $detalles['email'][0]);
        $this->assertSame('La confirmación de contraseña no coincide.', $detalles['password'][0]);

        $this->postJson('/api/v1/auth/registro', ['nombre' => 'Ana', 'email' => 'no-es-correo', 'password' => 'secreta123', 'password_confirmation' => 'secreta123'])
            ->assertJsonPath('error.detalles.email.0', 'El campo correo debe ser un correo electrónico válido.');
    }

    public function test_otros_mensajes_que_antes_salian_en_ingles(): void
    {
        $this->iniciarSesion();

        $this->postJson('/api/v1/salones', ['nombre' => 'Aula'])->assertCreated();
        $this->postJson('/api/v1/salones', ['nombre' => 'Aula'])->assertJsonPath('error.detalles.nombre.0', 'Ese nombre ya está en uso.');

        $salon = auth()->user()->salones()->first();
        $this->getJson("/api/v1/salones/{$salon->id}/estadisticas?zona_horaria=Marte/Base")
            ->assertJsonPath('error.detalles.zona_horaria.0', 'El campo zona horaria debe ser una zona horaria válida (p. ej. America/Bogota).');

        $actuador = $salon->actuadores()->first();
        $this->patchJson("/api/v1/sim/actuadores/{$actuador->id}", [])
            ->assertJsonPath('error.detalles.respuesta.0', 'El campo respuesta es obligatorio si no se envía conexión.');
    }

    /** @return list<string> reglas de Laravel que generan mensaje (sometimes/nullable no) */
    private function reglasDeLaravel(): array
    {
        return array_keys(require base_path('vendor/laravel/framework/src/Illuminate/Translation/lang/en/validation.php'));
    }
}

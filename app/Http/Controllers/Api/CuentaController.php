<?php

namespace App\Http\Controllers\Api;

use App\Enums\TipoEvento;
use App\Http\Controllers\Controller;
use App\Http\Requests\Cuenta\GuardarAlternativoRequest;
use App\Http\Requests\Cuenta\QuitarAlternativoRequest;
use App\Http\Requests\Cuenta\VerificarAlternativoRequest;
use App\Http\Resources\EventoResource;
use App\Models\Evento;
use App\Models\User;
use App\Servicios\CorreoAlternativo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** "Seguridad de mi cuenta": correo alternativo para recuperar la contraseña y actividad de la cuenta. */
class CuentaController extends Controller
{
    public function __construct(private readonly CorreoAlternativo $alternativo) {}

    public function seguridad(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->estado($request->user())]);
    }

    public function guardarAlternativo(GuardarAlternativoRequest $request): JsonResponse
    {
        $this->alternativo->solicitar($request->user(), $request->validated('correo_alternativo'));

        return response()->json([
            'data' => $this->estado($request->user()->fresh()),
            'mensaje' => 'Te enviamos un código de 6 dígitos a '.User::enmascarar($request->validated('correo_alternativo')).'. Escríbelo para verificarlo.',
        ]);
    }

    public function reenviarCodigo(Request $request): JsonResponse
    {
        $this->alternativo->reenviar($request->user());

        return response()->json([
            'data' => $this->estado($request->user()),
            'mensaje' => 'Te enviamos un código nuevo. El anterior ya no sirve.',
        ]);
    }

    public function verificarAlternativo(VerificarAlternativoRequest $request): JsonResponse
    {
        $this->alternativo->verificar($request->user(), $request->validated('codigo'));

        return response()->json([
            'data' => $this->estado($request->user()->fresh()),
            'mensaje' => 'Listo: tu correo alternativo quedó verificado. Ya puedes usarlo para recuperar la contraseña.',
        ]);
    }

    public function quitarAlternativo(QuitarAlternativoRequest $request): JsonResponse
    {
        $this->alternativo->quitar($request->user());

        return response()->json([
            'data' => $this->estado($request->user()->fresh()),
            'mensaje' => 'Quitaste tu correo alternativo.',
        ]);
    }

    /** @return array<string, mixed> */
    private function estado(User $usuario): array
    {
        $actividad = Evento::query()
            ->where('entidad_tipo', 'user')
            ->where('entidad_id', $usuario->id)
            ->whereIn('tipo', [TipoEvento::CuentaContrasena, TipoEvento::CuentaAlternativo])
            ->orderByDesc('id')
            ->limit(15)
            ->get();

        return [
            'email' => $usuario->email,
            // Enmascarado: el usuario lo reconoce y, si alguien mira la pantalla, no lo ve completo.
            'alternativo' => $usuario->correo_alternativo ? [
                'enmascarado' => User::enmascarar($usuario->correo_alternativo),
                'verificado' => $usuario->tieneAlternativoVerificado(),
                'verificado_en' => $usuario->correo_alternativo_verificado_en?->toIso8601String(),
            ] : null,
            'pendiente' => User::enmascarar($usuario->correo_alternativo_pendiente),
            'actividad' => EventoResource::collection($actividad)->resolve(),
        ];
    }
}

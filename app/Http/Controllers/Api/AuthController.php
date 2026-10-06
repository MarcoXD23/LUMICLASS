<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegistroRequest;
use App\Http\RespuestaError;
use App\Models\User;
use App\Servicios\CreadorSalon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * Navegador: sesión con la cookie "lumiclass_session" (registro, login, logout).
 * Scripts y placa (Fase 8): token con POST /auth/token y cabecera "Authorization: Bearer ...".
 */
class AuthController extends Controller
{
    public function registro(RegistroRequest $request, CreadorSalon $creador): JsonResponse
    {
        [$usuario, $salon] = DB::transaction(function () use ($request, $creador) {
            $usuario = User::create([
                'name' => $request->validated('nombre'),
                'email' => strtolower($request->validated('email')),
                'password' => $request->validated('password'),
            ]);

            return [$usuario, $creador->crearEjemplo($usuario)];
        });

        if ($request->hasSession()) {
            Auth::guard('web')->login($usuario);
            $request->session()->regenerate();
        }

        return response()->json(['data' => $this->usuario($usuario), 'salon_id' => $salon->id], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        if (! $request->hasSession()) {
            return RespuestaError::json(
                'sesion_no_disponible',
                'Este inicio de sesión es para el navegador. Desde un script usa POST /api/v1/auth/token.',
                400,
            );
        }

        if (! Auth::guard('web')->attempt($this->credenciales($request))) {
            return $this->credencialesInvalidas();
        }

        $request->session()->regenerate();

        return response()->json(['data' => $this->usuario($request->user('web'))]);
    }

    public function token(LoginRequest $request): JsonResponse
    {
        $usuario = User::query()->where('email', $this->credenciales($request)['email'])->first();

        if ($usuario === null || ! Hash::check($request->validated('password'), $usuario->password)) {
            return $this->credencialesInvalidas();
        }

        $token = $usuario->createToken($request->validated('nombre_dispositivo') ?? 'script');

        return response()->json(['data' => $this->usuario($usuario), 'token' => $token->plainTextToken], 201);
    }

    public function logout(Request $request): Response
    {
        $token = $request->user()->currentAccessToken();

        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        }

        if ($request->hasSession()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->noContent();
    }

    public function yo(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->usuario($request->user())]);
    }

    /** @return array{email: string, password: string} */
    private function credenciales(LoginRequest $request): array
    {
        $credenciales = $request->credenciales();
        $credenciales['email'] = strtolower($credenciales['email']);

        return $credenciales;
    }

    /** Mismo mensaje si el correo no existe o la contraseña está mal: no revela qué cuentas existen. */
    private function credencialesInvalidas(): JsonResponse
    {
        return RespuestaError::json('credenciales_invalidas', 'Correo o contraseña incorrectos.', 401);
    }

    /** @return array{id: int, nombre: string, email: string} */
    private function usuario(User $usuario): array
    {
        return ['id' => $usuario->id, 'nombre' => $usuario->name, 'email' => $usuario->email];
    }
}

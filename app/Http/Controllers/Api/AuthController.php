<?php

namespace App\Http\Controllers\Api;

use App\Enums\PropositoCodigo;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\EnviarCodigoRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\OlvideRequest;
use App\Http\Requests\Auth\RegistroRequest;
use App\Http\Requests\Auth\RestablecerConCodigoRequest;
use App\Http\Requests\Auth\RestablecerRequest;
use App\Http\RespuestaError;
use App\Models\User;
use App\Servicios\CambioDeContrasena;
use App\Servicios\CodigosVerificacion;
use App\Servicios\CorreoAlternativo;
use App\Servicios\CreadorSalon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Laravel\Sanctum\PersonalAccessToken;
use Throwable;

/**
 * Navegador: sesión con la cookie "lumiclass_session" (registro, login, logout).
 * Scripts y placa (Fase 8): token con POST /auth/token y cabecera "Authorization: Bearer ...".
 */
class AuthController extends Controller
{
    public function registro(RegistroRequest $request, CreadorSalon $creador, CorreoAlternativo $alternativo): JsonResponse
    {
        [$usuario, $salon] = DB::transaction(function () use ($request, $creador) {
            $usuario = User::create([
                'name' => $request->validated('nombre'),
                'email' => strtolower($request->validated('email')),
                'password' => $request->validated('password'),
            ]);

            return [$usuario, $creador->crearEjemplo($usuario)];
        });

        // Correo alternativo opcional: queda "sin verificar" y le llega un código para confirmarlo.
        $pidioAlternativo = $request->filled('correo_alternativo');
        if ($pidioAlternativo) {
            $alternativo->solicitar($usuario, $request->validated('correo_alternativo'));
        }

        if ($request->hasSession()) {
            Auth::guard('web')->login($usuario);
            $request->session()->regenerate();
        }

        return response()->json([
            'data' => $this->usuario($usuario),
            'salon_id' => $salon->id,
            'verificar_alternativo' => $pidioAlternativo,
        ], 201);
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

    /**
     * Envía el enlace para crear una contraseña nueva. La respuesta es SIEMPRE la misma (exista o no el correo,
     * o si ya se pidió hace poco): así nadie puede averiguar qué correos tienen cuenta.
     */
    public function olvide(OlvideRequest $request): JsonResponse
    {
        try {
            Password::broker()->sendResetLink(['email' => $request->validated('email')]);
        } catch (Throwable $error) {
            // P. ej. el SMTP no responde: queda en el log y el usuario ve el mismo mensaje.
            report($error);
        }

        return response()->json(['mensaje' => __('passwords.sent')]);
    }

    /** Cambia la contraseña con el enlace del correo, cierra las demás sesiones y deja ingresado al usuario. */
    public function restablecer(RestablecerRequest $request, CambioDeContrasena $cambio): JsonResponse
    {
        $usuario = null;

        $estado = Password::broker()->reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $cuenta, string $nueva) use (&$usuario, $request, $cambio) {
                // Revoca tokens, cierra otras sesiones, deja ingresado y lo anota en el historial.
                $cambio->aplicar($cuenta, $nueva, 'enlace', $request);
                $usuario = $cuenta;
            },
        );

        if ($estado !== Password::PASSWORD_RESET) {
            return RespuestaError::json('enlace_invalido', __('passwords.token'), 400);
        }

        return response()->json(['data' => $this->usuario($usuario), 'mensaje' => __('passwords.reset')]);
    }

    /**
     * Formas 2 y 3: envía un código de 6 dígitos al correo principal ("correo") o al alternativo verificado
     * ("alternativo"). La respuesta es SIEMPRE la misma: no revela si la cuenta existe, si tiene correo
     * alternativo ni si ya se llegó al límite de envíos.
     */
    public function enviarCodigo(EnviarCodigoRequest $request, CodigosVerificacion $codigos): JsonResponse
    {
        $via = $request->validated('via');
        $usuario = User::query()->where('email', $request->validated('email'))->first();

        if ($usuario !== null) {
            $motivo = 'Escribe este código en LUMICLASS para crear una contraseña nueva.';

            if ($via === 'correo') {
                $codigos->enviar($usuario, PropositoCodigo::RecuperarPrincipal, $usuario->email, $motivo);
            } elseif ($usuario->tieneAlternativoVerificado()) {
                $codigos->enviar($usuario, PropositoCodigo::RecuperarAlternativo, $usuario->correo_alternativo, $motivo);
            }
        }

        return response()->json(['mensaje' => $via === 'correo'
            ? 'Si la cuenta existe, te enviamos un código de 6 dígitos. Revisa también la carpeta de spam.'
            : 'Si la cuenta existe y tiene un correo alternativo verificado, te enviamos un código de 6 dígitos a ese correo.']);
    }

    /** Formas 2 y 3: con el código, define la contraseña nueva (mismo final que el enlace). */
    public function restablecerConCodigo(RestablecerConCodigoRequest $request, CodigosVerificacion $codigos, CambioDeContrasena $cambio): JsonResponse
    {
        $via = $request->validated('via');
        $email = $request->validated('email');
        $usuario = User::query()->where('email', $email)->first();

        // Los intentos se cuentan por el correo escrito, exista o no la cuenta: el bloqueo no revela nada.
        $codigos->consumir(
            $usuario,
            $via === 'correo' ? PropositoCodigo::RecuperarPrincipal : PropositoCodigo::RecuperarAlternativo,
            $request->validated('codigo'),
            'recuperar:'.$email,
        );

        $cambio->aplicar($usuario, $request->validated('password'), $via === 'correo' ? 'codigo' : 'alternativo', $request);

        return response()->json(['data' => $this->usuario($usuario), 'mensaje' => __('passwords.reset')]);
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

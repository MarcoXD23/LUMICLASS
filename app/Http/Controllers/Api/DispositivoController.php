<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\RespuestaError;
use App\Models\Actuador;
use App\Servicios\ServicioEsp32;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Lo llama el propio ESP32 (no el navegador): POST /api/v1/dispositivo/latido
 * Cabecera "Authorization: Bearer <clave>" · cuerpo {"on": true|false}
 * Responde {"orden": "on"|"off"|null, "intervalo": 2}: la placa aplica la orden y vuelve a llamar.
 */
class DispositivoController extends Controller
{
    public function latido(Request $request, ServicioEsp32 $esp32): JsonResponse
    {
        $clave = (string) $request->bearerToken();
        $actuador = $clave === '' ? null : Actuador::query()->where('clave_hash', Actuador::hashClave($clave))->first();

        if ($actuador === null) {
            return RespuestaError::json('clave_invalida', 'La clave del ESP32 no es válida. Genera una nueva en "Configurar salón" y cópiala en el sketch.', 401);
        }

        $datos = $request->validate(['on' => ['required', 'boolean']]);

        return response()->json($esp32->latido($actuador, (bool) $datos['on']));
    }
}

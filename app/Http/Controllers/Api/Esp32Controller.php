<?php

namespace App\Http\Controllers\Api;

use App\Enums\EstadoConexion;
use App\Enums\OrigenEvento;
use App\Enums\TipoEvento;
use App\Exceptions\ComandoRechazado;
use App\Http\Controllers\Controller;
use App\Http\Requests\GuardarEsp32Request;
use App\Http\Resources\ActuadorResource;
use App\Models\Actuador;
use App\Servicios\RegistroEventos;
use App\Servicios\ServicioEsp32;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * El ESP32 de cada luz, desde la app (con sesión). El {actuador} ya viene filtrado por dueño.
 * - Local: se guarda su IP y el servidor lo llama (sirve en el PC, misma red WiFi).
 * - Por internet: se genera una clave y el ESP32 llama al servidor (sirve desde el hosting).
 */
class Esp32Controller extends Controller
{
    public function __construct(
        private readonly ServicioEsp32 $esp32,
        private readonly RegistroEventos $eventos,
    ) {}

    /** ESP32 local: guarda su IP (y quita la clave, si tenía) y prueba la conexión enseguida. */
    public function guardar(GuardarEsp32Request $request, Actuador $actuador): JsonResponse
    {
        $this->exigirLibre($actuador);

        $direccion = $request->validated('direccion');

        if ($direccion === null) {
            return $this->quitar($actuador);
        }

        if ($direccion !== $actuador->direccion || $actuador->esp32PorInternet()) {
            $actuador->fill(['direccion' => $direccion, 'estado_reportado' => null]);
            $actuador->clave_hash = null;
            $actuador->save();
            Cache::forget("lumiclass.esp32.revisado.{$actuador->id}");
            $this->registrar($actuador, "ahora la mueve el ESP32 en {$direccion} (red local).", ['direccion' => $direccion]);
        }

        return $this->responder($actuador, $this->esp32->sincronizar($actuador));
    }

    /**
     * ESP32 por internet: genera una clave nueva (la anterior deja de servir) y la muestra UNA sola vez,
     * junto con la dirección del servidor, para copiarlas en el sketch.
     */
    public function generarClave(Actuador $actuador): JsonResponse
    {
        $this->exigirLibre($actuador);

        $clave = Str::random(40);
        $actuador->forceFill([
            'clave_hash' => Actuador::hashClave($clave),
            'direccion' => null,
            // Hasta que el ESP32 llame por primera vez no está conectado.
            'conexion' => EstadoConexion::Inactivo,
            'ultima_respuesta_en' => null,
            'estado_reportado' => null,
        ])->save();

        $this->registrar($actuador, 'se generó una clave para conectar su ESP32 por internet.');

        return response()->json([
            'data' => ActuadorResource::make($actuador->fresh()),
            'conexion' => [
                'servidor' => rtrim(config('app.url'), '/'),
                'clave' => $clave,
            ],
        ]);
    }

    /** Quita el ESP32 de la luz (local o por internet): vuelve a usar el driver del .env. */
    public function quitar(Actuador $actuador): JsonResponse
    {
        $this->exigirLibre($actuador);

        if ($actuador->tieneEsp32()) {
            $actuador->forceFill([
                'direccion' => null,
                'clave_hash' => null,
                'conexion' => EstadoConexion::Activo,
                'ultima_respuesta_en' => null,
                'estado_reportado' => null,
            ])->save();
            $this->registrar($actuador, 'se quitó su ESP32.');
        }

        return $this->responder($actuador, null);
    }

    /** Local: le pregunta al ESP32 ahora. Por internet: informa lo último que reportó. */
    public function probar(Actuador $actuador): JsonResponse
    {
        if (! $actuador->tieneEsp32()) {
            throw new ComandoRechazado('sin_esp32', 'Esta luz no tiene ESP32. Escribe su IP o conéctalo por internet.');
        }

        $prueba = $this->esp32->sincronizar($actuador);
        Cache::put("lumiclass.esp32.revisado.{$actuador->id}", true, (int) config('lumiclass.esp32.segundos_sincronizar'));

        return $this->responder($actuador, $prueba);
    }

    private function responder(Actuador $actuador, ?array $prueba): JsonResponse
    {
        return response()->json(['data' => ActuadorResource::make($actuador->fresh()), 'prueba' => $prueba]);
    }

    private function exigirLibre(Actuador $actuador): void
    {
        if ($actuador->ocupado) {
            throw new ComandoRechazado('actuador_ocupado', 'Esta luz está ejecutando una orden. Espera unos segundos e intenta de nuevo.');
        }
    }

    private function registrar(Actuador $actuador, string $cambio, array $datos = []): void
    {
        $nombre = $actuador->luz?->nombre ?? $actuador->nombre;
        $this->eventos->registrar(TipoEvento::Configuracion, OrigenEvento::Usuario, "Luz \"{$nombre}\": {$cambio}", $actuador, $datos);
    }
}

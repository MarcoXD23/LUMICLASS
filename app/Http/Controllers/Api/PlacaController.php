<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Placa\ConfirmarRequest;
use App\Http\Requests\Placa\HeartbeatRequest;
use App\Http\Requests\Placa\LecturasRequest;
use App\Models\Placa;
use App\Servicios\ServicioPlaca;
use App\Servicios\ServicioTick;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * API que usa la placa ESP32 (no las personas). Autenticada con la clave de la placa (AutenticarPlaca).
 * Respuestas cortas: la placa tiene poca memoria.
 */
class PlacaController extends Controller
{
    public function __construct(private readonly ServicioPlaca $servicio) {}

    public function heartbeat(HeartbeatRequest $request): JsonResponse
    {
        $placa = $this->placa($request);
        $this->servicio->heartbeat($placa, $request->ip(), $request->validated('version'));

        return response()->json([
            'ok' => true,
            'salon' => $placa->salon->nombre,
            'heartbeat_s' => config('lumiclass.placa.segundos_heartbeat'),
            'ordenes_ms' => config('lumiclass.placa.milisegundos_ordenes'),
        ]);
    }

    public function lecturas(LecturasRequest $request): JsonResponse
    {
        return response()->json($this->servicio->registrarLecturas($this->placa($request), $request->lecturas()));
    }

    /** La placa consulta cada segundo: se aprovecha para avanzar el tick (órdenes vencidas, reglas con tiempo). */
    public function ordenes(Request $request, ServicioTick $tick): JsonResponse
    {
        $tick->ejecutarSiCorresponde();

        return response()->json(['ordenes' => $this->servicio->ordenesPendientes($this->placa($request))]);
    }

    public function confirmar(ConfirmarRequest $request): JsonResponse
    {
        $estado = $this->servicio->confirmar(
            $this->placa($request),
            $request->validated('codigo'),
            $request->validated('resultado'),
            $request->validated('mensaje'),
        );

        return response()->json(['estado' => $estado]);
    }

    private function placa(Request $request): Placa
    {
        return $request->attributes->get('placa');
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Simulador\ActuadorRequest;
use App\Http\Requests\Simulador\ConexionSensorRequest;
use App\Http\Requests\Simulador\InterruptorRequest;
use App\Http\Requests\Simulador\PresenciaRequest;
use App\Http\Resources\LuzResource;
use App\Http\Resources\SensorResource;
use App\Models\Actuador;
use App\Models\Luz;
use App\Models\Salon;
use App\Models\Sensor;
use App\Models\Zona;
use App\Servicios\ServicioTick;
use App\Servicios\Simulador;
use Illuminate\Http\JsonResponse;

class SimuladorController extends Controller
{
    public function __construct(private readonly Simulador $simulador) {}

    public function estado(Salon $salon): JsonResponse
    {
        return response()->json(['data' => $this->simulador->estado($salon)]);
    }

    public function presencia(PresenciaRequest $request, Salon $salon): JsonResponse
    {
        // zona_id ya se validó como zona de este salón.
        $zona = $request->filled('zona_id') ? Zona::findOrFail($request->integer('zona_id')) : null;

        $resumen = $this->simulador->forzarPresencia(
            $salon,
            $request->boolean('presencia'),
            $zona,
            $request->filled('conteo_personas') ? $request->integer('conteo_personas') : null,
        );

        return response()->json(['data' => $resumen]);
    }

    public function sensor(ConexionSensorRequest $request, Sensor $sensor): JsonResponse
    {
        $cambio = $this->simulador->cambiarConexionSensor($sensor, $request->conexion());

        return response()->json(['data' => SensorResource::make($sensor->fresh())->resolve(), 'cambio' => $cambio]);
    }

    public function actuador(ActuadorRequest $request, Actuador $actuador): JsonResponse
    {
        $this->simulador->configurarActuador($actuador, $request->respuesta(), $request->conexion());

        return response()->json(['data' => $this->simulador->estadoActuador($actuador->fresh())]);
    }

    public function interruptor(InterruptorRequest $request, Luz $luz): JsonResponse
    {
        $this->simulador->usarInterruptor($luz, $request->estado());

        return response()->json(['data' => LuzResource::make($luz->fresh('actuador'))->resolve()]);
    }

    /** El tick avanza el tiempo de todo el sistema (no solo de este salón): es lo mismo que hace el programador. */
    public function tick(Salon $salon, ServicioTick $tick): JsonResponse
    {
        return response()->json(['data' => $tick->ejecutar()]);
    }

    public function reiniciar(Salon $salon): JsonResponse
    {
        $this->simulador->reiniciar($salon);

        return response()->json(['data' => ['mensaje' => 'Escenario reiniciado.']]);
    }
}

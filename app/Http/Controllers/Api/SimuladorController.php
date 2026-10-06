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
use App\Models\Sensor;
use App\Models\Zona;
use App\Servicios\ServicioTick;
use App\Servicios\Simulador;
use Illuminate\Http\JsonResponse;

class SimuladorController extends Controller
{
    public function __construct(private readonly Simulador $simulador) {}

    public function estado(): JsonResponse
    {
        return response()->json(['data' => $this->simulador->estado()]);
    }

    public function presencia(PresenciaRequest $request): JsonResponse
    {
        $zona = $request->filled('zona_id') ? Zona::findOrFail($request->integer('zona_id')) : null;

        $resumen = $this->simulador->forzarPresencia(
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

        $estado = collect($this->simulador->estado()['actuadores'])->firstWhere('id', $actuador->id);

        return response()->json(['data' => $estado]);
    }

    public function interruptor(InterruptorRequest $request, Luz $luz): JsonResponse
    {
        $this->simulador->usarInterruptor($luz, $request->estado());

        return response()->json(['data' => LuzResource::make($luz->fresh('actuador'))->resolve()]);
    }

    public function tick(ServicioTick $tick): JsonResponse
    {
        return response()->json(['data' => $tick->ejecutar()]);
    }

    public function reiniciar(): JsonResponse
    {
        $this->simulador->reiniciar();

        return response()->json(['data' => ['mensaje' => 'Escenario reiniciado.']]);
    }
}

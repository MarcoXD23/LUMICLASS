<?php

namespace App\Servicios;

use App\Drivers\EscenarioSimulado;
use App\Enums\EstadoConexion;
use App\Enums\EstadoLuz;
use App\Enums\ModoZona;
use App\Enums\OrigenEvento;
use App\Enums\RespuestaSimulada;
use App\Enums\SeveridadEvento;
use App\Enums\TipoEvento;
use App\Exceptions\ComandoRechazado;
use App\Models\Actuador;
use App\Models\Luz;
use App\Models\Salon;
use App\Models\Sensor;
use App\Models\Zona;
use Illuminate\Support\Facades\DB;

/** Acciones de la página "Simulador": fuerzan situaciones en UN salón para probar y presentar el sistema. */
class Simulador
{
    public function __construct(
        private readonly ServicioSensores $sensores,
        private readonly MotorReglas $motor,
        private readonly EscenarioSimulado $escenario,
        private readonly RegistroEventos $eventos,
    ) {}

    /**
     * Fuerza presencia (o ausencia) en los sensores activos de una zona o de todo el salón.
     *
     * @return array{sensores_actualizados: int, ordenes_reglas: int}
     *
     * @throws ComandoRechazado si no hay sensores activos
     */
    public function forzarPresencia(Salon $salon, bool $presencia, ?Zona $zona, ?int $conteoPersonas): array
    {
        $sensores = $salon->sensores()
            ->where('sensores.conexion', EstadoConexion::Activo)
            ->when($zona, fn ($q) => $q->where('sensores.zona_id', $zona->id))
            ->get();

        if ($sensores->isEmpty()) {
            throw new ComandoRechazado('sin_sensores_activos', 'No hay sensores activos donde simular la presencia.');
        }

        foreach ($sensores as $sensor) {
            $this->sensores->registrarLectura($sensor, $presencia, $conteoPersonas, OrigenEvento::Simulador);
        }

        $ordenes = 0;
        foreach (Zona::query()->whereIn('id', $sensores->pluck('zona_id')->unique())->get() as $zonaAfectada) {
            $ordenes += $this->motor->evaluarZona($zonaAfectada);
        }

        return ['sensores_actualizados' => $sensores->count(), 'ordenes_reglas' => $ordenes];
    }

    public function cambiarConexionSensor(Sensor $sensor, EstadoConexion $conexion): bool
    {
        $cambio = $this->sensores->cambiarConexion($sensor, $conexion, OrigenEvento::Simulador);

        if ($cambio) {
            $this->motor->evaluarZona($sensor->zona);
        }

        return $cambio;
    }

    public function configurarActuador(Actuador $actuador, ?RespuestaSimulada $respuesta, ?EstadoConexion $conexion): void
    {
        if ($respuesta !== null) {
            $this->escenario->definirRespuesta($actuador, $respuesta);
        }

        if ($conexion !== null && $actuador->conexion !== $conexion) {
            $anterior = $actuador->conexion;
            $actuador->conexion = $conexion;
            $actuador->save();

            $this->eventos->registrar(
                TipoEvento::ActuadorConexion,
                OrigenEvento::Simulador,
                "Servo \"{$actuador->nombre}\": {$anterior->value} → {$conexion->value}.",
                $actuador,
                ['conexion_anterior' => $anterior->value, 'conexion' => $conexion->value],
                $conexion === EstadoConexion::Activo ? SeveridadEvento::Info : SeveridadEvento::Error,
            );
        }
    }

    /**
     * Simula que alguien usó el interruptor de pared a mano. Solo cambia el estado real;
     * en modo automático, el próximo tick puede volver a aplicar la regla.
     */
    public function usarInterruptor(Luz $luz, EstadoLuz $estado): void
    {
        $luz->estado_real = $estado;
        $luz->save();

        $this->eventos->registrar(
            TipoEvento::LuzInterruptor,
            OrigenEvento::Simulador,
            "Alguien dejó la luz \"{$luz->nombre}\" {$estado->value} con el interruptor de pared.",
            $luz,
            ['estado_real' => $estado->value],
        );
    }

    /** Vuelve al escenario inicial SOLO en este salón: todo activo, sin lecturas, luces apagadas y zonas en automático. */
    public function reiniciar(Salon $salon): void
    {
        $zonas = $salon->zonas()->pluck('id');

        DB::transaction(function () use ($salon, $zonas) {
            Sensor::query()->whereIn('zona_id', $zonas)->update([
                'conexion' => EstadoConexion::Activo->value,
                'presencia' => null,
                'presencia_desde' => null,
                'conteo_personas' => null,
                'ultima_lectura' => null,
                'updated_at' => now(),
            ]);
            Actuador::query()->where('salon_id', $salon->id)->update([
                'conexion' => EstadoConexion::Activo->value,
                'ocupado' => false,
                'orden_pendiente' => null,
                'orden_iniciada_en' => null,
                'ultimo_resultado' => null,
                'updated_at' => now(),
            ]);
            Luz::query()->whereIn('zona_id', $zonas)->update([
                'estado_deseado' => EstadoLuz::Apagada->value,
                'estado_real' => EstadoLuz::Apagada->value,
                'updated_at' => now(),
            ]);
            Zona::query()->whereIn('id', $zonas)->update(['modo' => ModoZona::Automatico->value, 'updated_at' => now()]);

            $this->eventos->registrar(TipoEvento::SimuladorReinicio, OrigenEvento::Simulador, 'Escenario del simulador reiniciado.', $salon);
        });

        $this->escenario->reiniciar($salon);
    }

    /** @return array<string, mixed> */
    public function estado(Salon $salon): array
    {
        return [
            'driver' => config('lumiclass.driver'),
            'tiempos' => [
                'servo_segundos_lento' => config('lumiclass.servo.segundos_lento'),
                'servo_segundos_espera' => config('lumiclass.servo.segundos_espera_confirmacion'),
                'factor_tiempo_reglas' => config('lumiclass.reglas.factor_tiempo'),
            ],
            'actuadores' => $salon->actuadores()->orderBy('id')->get()->map(fn (Actuador $actuador) => $this->estadoActuador($actuador))->all(),
        ];
    }

    /** @return array<string, mixed> */
    public function estadoActuador(Actuador $actuador): array
    {
        return [
            'id' => $actuador->id,
            'nombre' => $actuador->nombre,
            'conexion' => $actuador->conexion->value,
            'ocupado' => $actuador->ocupado,
            'orden_pendiente' => $actuador->orden_pendiente?->value,
            'respuesta_simulada' => $this->escenario->respuesta($actuador)->value,
        ];
    }
}

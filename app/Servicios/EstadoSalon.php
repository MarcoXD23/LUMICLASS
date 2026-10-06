<?php

namespace App\Servicios;

use App\Enums\EstadoConexion;
use App\Enums\EstadoLuz;
use App\Enums\Ocupacion;
use App\Models\Luz;
use App\Models\Salon;
use App\Models\Sensor;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/** Arma el resumen del dashboard a partir de un salón con zonas, luces y sensores cargados. */
class EstadoSalon
{
    /** @return array<string, mixed> */
    public function resumen(Salon $salon): array
    {
        $luces = $salon->zonas->flatMap->luces;
        $sensores = $salon->zonas->flatMap->sensores;

        return [
            'ocupacion' => Ocupacion::desdeSensores($sensores)->value,
            'personas_detectadas' => $this->personas($sensores),
            'ultima_actualizacion' => $this->ultimaActualizacion($salon, $luces, $sensores)?->toIso8601String(),
            'luces' => [
                'total' => $luces->count(),
                'encendidas' => $luces->where('estado_real', EstadoLuz::Encendida)->count(),
                'apagadas' => $luces->where('estado_real', EstadoLuz::Apagada)->count(),
                'desconocidas' => $luces->where('estado_real', EstadoLuz::Desconocida)->count(),
            ],
            'sensores' => [
                'total' => $sensores->count(),
                'activos' => $sensores->where('conexion', EstadoConexion::Activo)->count(),
            ],
        ];
    }

    /**
     * Alertas del dashboard: sensores o servos que no están activos, y luces sin servo.
     *
     * @return list<array{nivel: string, mensaje: string, entidad_tipo: string, entidad_id: int}>
     */
    public function alertas(Salon $salon): array
    {
        $alertas = [];

        foreach ($salon->zonas->flatMap->sensores as $sensor) {
            if ($sensor->conexion !== EstadoConexion::Activo) {
                $alertas[] = $this->alertaConexion($sensor->conexion, "Sensor \"{$sensor->nombre}\" {$sensor->conexion->value}.", 'sensor', $sensor->id);
            }
        }

        foreach ($salon->zonas->flatMap->luces as $luz) {
            $actuador = $luz->actuador;

            if ($actuador === null) {
                $alertas[] = [
                    'nivel' => 'advertencia',
                    'mensaje' => "La luz \"{$luz->nombre}\" no tiene servo asignado.",
                    'entidad_tipo' => 'luz',
                    'entidad_id' => $luz->id,
                ];
            } elseif ($actuador->conexion !== EstadoConexion::Activo) {
                $alertas[] = $this->alertaConexion($actuador->conexion, "Servo \"{$actuador->nombre}\" {$actuador->conexion->value}.", 'actuador', $actuador->id);
            } elseif ($luz->estado_real === EstadoLuz::Desconocida && $actuador->ultimo_resultado !== null && $actuador->ultimo_resultado !== 'ok') {
                // La última orden falló o no tuvo respuesta: no sabemos si la luz está encendida.
                $alertas[] = [
                    'nivel' => 'error',
                    'mensaje' => "Luz \"{$luz->nombre}\" en estado desconocido. {$actuador->ultimo_resultado}",
                    'entidad_tipo' => 'luz',
                    'entidad_id' => $luz->id,
                ];
            }
        }

        return $alertas;
    }

    /** @param  Collection<int, Sensor>  $sensores */
    private function personas(Collection $sensores): ?int
    {
        $conConteo = $sensores->whereNotNull('conteo_personas');

        // Solo se informa si algún sensor puede contar personas.
        return $conConteo->isEmpty() ? null : (int) $conConteo->sum('conteo_personas');
    }

    /**
     * @param  Collection<int, Luz>  $luces
     * @param  Collection<int, Sensor>  $sensores
     */
    private function ultimaActualizacion(Salon $salon, Collection $luces, Collection $sensores): ?Carbon
    {
        return collect([$salon->updated_at])
            ->merge($salon->zonas->pluck('updated_at'))
            ->merge($luces->pluck('updated_at'))
            ->merge($luces->pluck('actuador.updated_at'))
            ->merge($sensores->pluck('updated_at'))
            ->merge($sensores->pluck('ultima_lectura'))
            ->filter()
            ->max();
    }

    /** @return array{nivel: string, mensaje: string, entidad_tipo: string, entidad_id: int} */
    private function alertaConexion(EstadoConexion $conexion, string $mensaje, string $tipo, int $id): array
    {
        return [
            'nivel' => $conexion === EstadoConexion::Falla ? 'error' : 'advertencia',
            'mensaje' => $mensaje,
            'entidad_tipo' => $tipo,
            'entidad_id' => $id,
        ];
    }
}

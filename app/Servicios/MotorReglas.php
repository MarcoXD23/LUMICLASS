<?php

namespace App\Servicios;

use App\Enums\AccionLuz;
use App\Enums\EstadoConexion;
use App\Enums\ModoZona;
use App\Enums\Ocupacion;
use App\Enums\OrigenEvento;
use App\Exceptions\ComandoRechazado;
use App\Models\Regla;
use App\Models\Sensor;
use App\Models\Zona;
use Illuminate\Support\Collection;

/**
 * Evalúa las reglas activas de una zona en modo automático.
 * Gana la primera regla (por prioridad) cuya condición se cumple por completo, incluida su duración.
 */
class MotorReglas
{
    public function __construct(private readonly ServicioLuces $luces) {}

    /** @return int órdenes enviadas en total */
    public function evaluarTodas(): int
    {
        return Zona::query()
            ->where('modo', ModoZona::Automatico)
            ->orderBy('id')
            ->get()
            ->sum(fn (Zona $zona) => $this->evaluarZona($zona));
    }

    /** @return int órdenes enviadas */
    public function evaluarZona(Zona $zona): int
    {
        $zona = $zona->fresh(['sensores', 'luces.actuador']);

        if ($zona === null || $zona->modo !== ModoZona::Automatico) {
            return 0;
        }

        $ocupacion = Ocupacion::desdeSensores($zona->sensores);
        if ($ocupacion === Ocupacion::Desconocida) {
            return 0;
        }

        $regla = $this->reglaAplicable($zona, $ocupacion, $this->segundosEnEstado($zona->sensores, $ocupacion));
        if ($regla === null) {
            return 0;
        }

        $accion = AccionLuz::from($regla->accion['accion']);

        // Con un sensor en falla no se apaga nada: podría haber gente que ese sensor no ve.
        $hayFalla = $zona->sensores->contains(fn (Sensor $sensor) => $sensor->conexion !== EstadoConexion::Activo);
        if ($accion === AccionLuz::Apagar && $hayFalla) {
            return 0;
        }

        $enviadas = 0;

        foreach ($zona->luces as $luz) {
            if (! $this->luces->requiereAccion($luz, $accion)) {
                continue;
            }

            try {
                $this->luces->comandarLuz($luz, $accion, OrigenEvento::Regla, $regla);
                $enviadas++;
            } catch (ComandoRechazado) {
                // Ya quedó en el historial; se sigue con las demás luces.
            }
        }

        return $enviadas;
    }

    private function reglaAplicable(Zona $zona, Ocupacion $ocupacion, float $segundosEnEstado): ?Regla
    {
        $factor = (float) config('lumiclass.reglas.factor_tiempo');

        return Regla::query()
            ->where('activa', true)
            ->where(fn ($q) => $q->whereNull('zona_id')->orWhere('zona_id', $zona->id))
            ->ordenadas()
            ->get()
            ->first(fn (Regla $regla) => ($regla->condicion['presencia'] ?? null) === $ocupacion->value
                && $segundosEnEstado >= ($regla->condicion['duracion_segundos'] ?? 0) * $factor);
    }

    /**
     * Segundos que la zona lleva ocupada (desde el primer sensor que detectó a alguien)
     * o vacía (desde el último sensor que dejó de detectar).
     *
     * @param  Collection<int, Sensor>  $sensores
     */
    private function segundosEnEstado(Collection $sensores, Ocupacion $ocupacion): float
    {
        $conLectura = $sensores->filter(fn (Sensor $s) => $s->conexion === EstadoConexion::Activo && $s->presencia !== null);

        $desde = $ocupacion === Ocupacion::Ocupado
            ? $conLectura->where('presencia', true)->pluck('presencia_desde')->filter()->min()
            : $conLectura->pluck('presencia_desde')->filter()->max();

        return $desde === null ? 0.0 : max(0.0, $desde->diffInSeconds(now()));
    }
}

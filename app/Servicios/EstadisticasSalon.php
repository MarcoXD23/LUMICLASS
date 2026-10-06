<?php

namespace App\Servicios;

use App\Enums\EstadoLuz;
use App\Enums\Ocupacion;
use App\Enums\SeveridadEvento;
use App\Enums\TipoEvento;
use App\Models\CambioLuz;
use App\Models\CambioOcupacion;
use App\Models\Salon;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;

/**
 * Estadísticas de un salón en un periodo, calculadas con "tramos" de tiempo [inicio, fin) en segundos:
 * - horas encendidas: tramos en que cada luz estuvo encendida (cambios_luz);
 * - horas ocupado: unión de los tramos en que alguna zona estuvo ocupada (cambios_ocupacion);
 * - desperdicio: luz encendida mientras SU zona estaba vacía (intersección de ambos).
 * Una luz o zona sin datos ("desconocida") no suma a ninguno.
 */
class EstadisticasSalon
{
    /** @return array<string, mixed> */
    public function calcular(Salon $salon, CarbonImmutable $desde, CarbonImmutable $hasta, string $zonaHoraria): array
    {
        // No se cuenta el futuro: si el periodo es "hoy", termina ahora.
        $hasta = $hasta->min(CarbonImmutable::now());
        [$ini, $fin] = [$desde->getTimestamp(), $hasta->getTimestamp()];

        $zonas = $salon->zonas()->with('luces')->orderBy('id')->get();
        $dias = $this->dias($desde, $hasta, $zonaHoraria);

        $ocupadoPorZona = [];
        $vacioPorZona = [];
        foreach ($zonas as $zona) {
            $tramos = $this->tramos(CambioOcupacion::query()->where('zona_id', $zona->id), 'ocupacion', $ini, $fin);
            $ocupadoPorZona[] = $this->filtrar($tramos, Ocupacion::Ocupado);
            $vacioPorZona[$zona->id] = $this->filtrar($tramos, Ocupacion::Vacio);
        }

        $luces = [];
        $encendidasTodas = [];
        $desperdicioTodas = [];
        foreach ($zonas as $zona) {
            foreach ($zona->luces->sortBy('id') as $luz) {
                $encendida = $this->filtrar(
                    $this->tramos(CambioLuz::query()->where('luz_id', $luz->id), 'estado', $ini, $fin),
                    EstadoLuz::Encendida,
                );
                $desperdicio = $this->interseccion($encendida, $vacioPorZona[$zona->id]);

                $encendidasTodas[] = $encendida;
                $desperdicioTodas[] = $desperdicio;
                $luces[] = [
                    'id' => $luz->id,
                    'nombre' => $luz->nombre,
                    'zona' => $zona->nombre,
                    'segundos_encendida' => $this->duracion($encendida),
                    'segundos_desperdicio' => $this->duracion($desperdicio),
                ];
            }
        }

        return [
            'desde' => $desde->toIso8601String(),
            'hasta' => $hasta->toIso8601String(),
            'zona_horaria' => $zonaHoraria,
            'totales' => [
                'segundos_encendidas' => array_sum(array_column($luces, 'segundos_encendida')),
                'segundos_ocupado' => $this->duracion($this->union(...$ocupadoPorZona)),
                'segundos_desperdicio' => array_sum(array_column($luces, 'segundos_desperdicio')),
                'encendidos' => $this->contarCambiosLuz($salon, EstadoLuz::Encendida, $desde, $hasta),
                'apagados' => $this->contarCambiosLuz($salon, EstadoLuz::Apagada, $desde, $hasta),
                'fallas' => $salon->eventos()->where('severidad', SeveridadEvento::Error)->whereBetween('created_at', [$desde, $hasta])->count(),
                'ordenes' => $this->ordenesPorOrigen($salon, $desde, $hasta),
            ],
            'luces' => $luces,
            'por_dia' => array_map(fn (array $dia) => [
                'fecha' => $dia['fecha'],
                'segundos_encendidas' => array_sum(array_map(fn ($t) => $this->duracion($this->recortar($t, $dia['ini'], $dia['fin'])), $encendidasTodas)),
                'segundos_desperdicio' => array_sum(array_map(fn ($t) => $this->duracion($this->recortar($t, $dia['ini'], $dia['fin'])), $desperdicioTodas)),
            ], $dias),
        ];
    }

    /**
     * Tramos [inicio, fin, estado] dentro de [ini, fin): el estado al inicio es el del último cambio anterior.
     *
     * @return list<array{0: int, 1: int, 2: mixed}>
     */
    private function tramos(Builder $consulta, string $campo, int $ini, int $fin): array
    {
        $previo = (clone $consulta)
            ->where('created_at', '<=', CarbonImmutable::createFromTimestamp($ini))
            ->orderByDesc('created_at')->orderByDesc('id')
            ->first();

        $cambios = (clone $consulta)
            ->where('created_at', '>', CarbonImmutable::createFromTimestamp($ini))
            ->where('created_at', '<', CarbonImmutable::createFromTimestamp($fin))
            ->orderBy('created_at')->orderBy('id')
            ->get();

        $tramos = [];
        $estado = $previo?->{$campo};
        $inicio = $ini;

        foreach ($cambios as $cambio) {
            $momento = $cambio->created_at->getTimestamp();
            if ($estado !== null && $momento > $inicio) {
                $tramos[] = [$inicio, $momento, $estado];
            }
            $estado = $cambio->{$campo};
            $inicio = $momento;
        }

        if ($estado !== null && $fin > $inicio) {
            $tramos[] = [$inicio, $fin, $estado];
        }

        return $tramos;
    }

    /** @return list<array{0: int, 1: int}> */
    private function filtrar(array $tramos, mixed $estado): array
    {
        return array_values(array_map(
            fn (array $t) => [$t[0], $t[1]],
            array_filter($tramos, fn (array $t) => $t[2] === $estado),
        ));
    }

    /** Partes en que A y B se superponen (ambas listas ordenadas y sin solapes internos). */
    private function interseccion(array $a, array $b): array
    {
        $resultado = [];
        [$i, $j] = [0, 0];

        while ($i < count($a) && $j < count($b)) {
            $inicio = max($a[$i][0], $b[$j][0]);
            $fin = min($a[$i][1], $b[$j][1]);
            if ($fin > $inicio) {
                $resultado[] = [$inicio, $fin];
            }
            $a[$i][1] < $b[$j][1] ? $i++ : $j++;
        }

        return $resultado;
    }

    /** Une varias listas de tramos fusionando los que se tocan (p. ej. dos zonas ocupadas a la vez cuentan una vez). */
    private function union(array ...$listas): array
    {
        $todos = array_merge(...($listas ?: [[]]));
        usort($todos, fn ($x, $y) => $x[0] <=> $y[0]);

        $resultado = [];
        foreach ($todos as [$inicio, $fin]) {
            $ultimo = count($resultado) - 1;
            if ($ultimo >= 0 && $inicio <= $resultado[$ultimo][1]) {
                $resultado[$ultimo][1] = max($resultado[$ultimo][1], $fin);
            } else {
                $resultado[] = [$inicio, $fin];
            }
        }

        return $resultado;
    }

    private function recortar(array $tramos, int $ini, int $fin): array
    {
        return $this->interseccion($tramos, [[$ini, $fin]]);
    }

    private function duracion(array $tramos): int
    {
        return array_sum(array_map(fn (array $t) => $t[1] - $t[0], $tramos));
    }

    /**
     * Días del periodo según la hora local del usuario (no la del servidor).
     *
     * @return list<array{fecha: string, ini: int, fin: int}>
     */
    private function dias(CarbonImmutable $desde, CarbonImmutable $hasta, string $zonaHoraria): array
    {
        $dias = [];
        $dia = $desde->setTimezone($zonaHoraria)->startOfDay();
        $limite = $hasta->setTimezone($zonaHoraria);

        while ($dia <= $limite) {
            $siguiente = $dia->addDay();
            $dias[] = [
                'fecha' => $dia->toDateString(),
                'ini' => max($dia->getTimestamp(), $desde->getTimestamp()),
                'fin' => min($siguiente->getTimestamp(), $hasta->getTimestamp()),
            ];
            $dia = $siguiente;
        }

        return $dias;
    }

    private function contarCambiosLuz(Salon $salon, EstadoLuz $estado, CarbonImmutable $desde, CarbonImmutable $hasta): int
    {
        $luces = $salon->luces()->pluck('luces.id');

        // La primera fila de cada luz es su estado al crearla, no un encendido ni un apagado.
        $iniciales = CambioLuz::query()->whereIn('luz_id', $luces)->selectRaw('min(id)')->groupBy('luz_id');

        return CambioLuz::query()
            ->whereIn('luz_id', $luces)
            ->whereNotIn('id', $iniciales)
            ->where('estado', $estado)
            ->whereBetween('created_at', [$desde, $hasta])
            ->count();
    }

    /** @return array<string, int> órdenes a luces por origen (usuario, regla, sistema, simulador) */
    private function ordenesPorOrigen(Salon $salon, CarbonImmutable $desde, CarbonImmutable $hasta): array
    {
        $conteo = $salon->eventos()
            ->where('tipo', TipoEvento::LuzComando)
            ->whereBetween('created_at', [$desde, $hasta])
            ->selectRaw('origen, count(*) as total')
            ->groupBy('origen')
            ->pluck('total', 'origen');

        return ['usuario' => (int) ($conteo['usuario'] ?? 0), 'regla' => (int) ($conteo['regla'] ?? 0)];
    }
}

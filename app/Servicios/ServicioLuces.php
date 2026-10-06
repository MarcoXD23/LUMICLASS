<?php

namespace App\Servicios;

use App\Enums\AccionLuz;
use App\Enums\EstadoConexion;
use App\Enums\EstadoLuz;
use App\Enums\ModoZona;
use App\Enums\OrigenEvento;
use App\Enums\SeveridadEvento;
use App\Enums\TipoEvento;
use App\Exceptions\ComandoRechazado;
use App\Models\Luz;
use App\Models\Zona;
use Illuminate\Support\Facades\DB;

/**
 * Reglas de negocio de las órdenes a las luces.
 * En la Fase 4 solo se guarda el estado deseado; el driver (Fase 5) moverá el servo
 * y actualizará el estado real.
 */
class ServicioLuces
{
    public function __construct(
        private readonly RegistroEventos $eventos,
        private readonly ServicioZonas $zonas,
    ) {}

    /** @throws ComandoRechazado */
    public function comandarLuz(Luz $luz, AccionLuz $accion, OrigenEvento $origen): ResultadoComando
    {
        try {
            return DB::transaction(fn () => $this->aplicar($luz, $accion, $origen));
        } catch (ComandoRechazado $rechazo) {
            // Fuera de la transacción para que el rechazo sí quede en el historial.
            $this->eventos->registrar(
                TipoEvento::ComandoRechazado,
                $origen,
                $rechazo->getMessage(),
                $luz,
                ['accion' => $accion->value, 'codigo' => $rechazo->codigo],
                SeveridadEvento::Advertencia,
            );

            throw $rechazo;
        }
    }

    /**
     * Ordena todas las luces de la zona. Una luz rechazada no detiene a las demás.
     *
     * @return list<array{luz_id: int, resultado: string, mensaje: string, codigo?: string}>
     */
    public function comandarZona(Zona $zona, AccionLuz $accion, OrigenEvento $origen): array
    {
        $resultados = [];

        foreach ($zona->luces()->orderBy('id')->get() as $luz) {
            try {
                $resultado = $this->comandarLuz($luz, $accion, $origen);
                $resultados[] = [
                    'luz_id' => $luz->id,
                    'resultado' => $resultado->cambio ? 'cambiada' : 'sin_cambio',
                    'mensaje' => $resultado->mensaje,
                ];
            } catch (ComandoRechazado $rechazo) {
                $resultados[] = [
                    'luz_id' => $luz->id,
                    'resultado' => 'rechazada',
                    'codigo' => $rechazo->codigo,
                    'mensaje' => $rechazo->getMessage(),
                ];
            }
        }

        return $resultados;
    }

    private function aplicar(Luz $luz, AccionLuz $accion, OrigenEvento $origen): ResultadoComando
    {
        $luz = Luz::query()->with(['actuador', 'zona'])->lockForUpdate()->findOrFail($luz->getKey());
        $objetivo = $accion->estadoObjetivo();

        $this->validarActuador($luz);

        if ($this->yaEstaEn($luz, $objetivo)) {
            return new ResultadoComando($luz, false, "La luz \"{$luz->nombre}\" ya está {$objetivo->value}; no se movió el servo.");
        }

        // Una orden manual sobre una zona automática la pasa a manual (si no, una regla la revertiría).
        if ($origen === OrigenEvento::Usuario && $luz->zona->modo === ModoZona::Automatico) {
            $this->zonas->cambiarModo($luz->zona, ModoZona::Manual, $origen, 'Motivo: orden manual sobre una luz.');
        }

        $anterior = $luz->estado_deseado;
        $luz->estado_deseado = $objetivo;
        $luz->save();

        $this->eventos->registrar(
            TipoEvento::LuzComando,
            $origen,
            "Orden \"{$accion->value}\" para la luz \"{$luz->nombre}\".",
            $luz,
            [
                'accion' => $accion->value,
                'estado_deseado_anterior' => $anterior->value,
                'estado_deseado' => $objetivo->value,
            ],
        );

        return new ResultadoComando(
            $luz->fresh(['actuador', 'zona']),
            true,
            "Orden \"{$accion->value}\" registrada para la luz \"{$luz->nombre}\".",
        );
    }

    /** @throws ComandoRechazado */
    private function validarActuador(Luz $luz): void
    {
        $actuador = $luz->actuador;

        if ($actuador === null) {
            throw new ComandoRechazado('sin_actuador', "La luz \"{$luz->nombre}\" no tiene un servo asignado.");
        }

        if ($actuador->conexion !== EstadoConexion::Activo) {
            throw new ComandoRechazado(
                'actuador_no_disponible',
                "El servo \"{$actuador->nombre}\" está {$actuador->conexion->value}; no se puede accionar.",
            );
        }

        if ($actuador->ocupado) {
            throw new ComandoRechazado(
                'actuador_ocupado',
                "El servo \"{$actuador->nombre}\" está ejecutando otra orden. Intenta de nuevo en unos segundos.",
            );
        }
    }

    /** Si el estado real es desconocido, se compara con el último estado deseado. */
    private function yaEstaEn(Luz $luz, EstadoLuz $objetivo): bool
    {
        return $luz->estado_real === $objetivo
            || ($luz->estado_real === EstadoLuz::Desconocida && $luz->estado_deseado === $objetivo);
    }
}

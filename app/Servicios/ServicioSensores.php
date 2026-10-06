<?php

namespace App\Servicios;

use App\Enums\EstadoConexion;
use App\Enums\OrigenEvento;
use App\Enums\SeveridadEvento;
use App\Enums\TipoEvento;
use App\Exceptions\ComandoRechazado;
use App\Models\Sensor;

/**
 * Punto de entrada de las lecturas de presencia, vengan del simulador o (Fase 8) de la placa.
 * No evalúa reglas: quien llama decide cuándo, para no evaluar a mitad de una actualización.
 */
class ServicioSensores
{
    public function __construct(private readonly RegistroEventos $eventos) {}

    /**
     * Devuelve true si la presencia cambió.
     *
     * @throws ComandoRechazado si el sensor no está activo
     */
    public function registrarLectura(Sensor $sensor, bool $presencia, ?int $conteoPersonas, OrigenEvento $origen): bool
    {
        if ($sensor->conexion !== EstadoConexion::Activo) {
            throw new ComandoRechazado(
                'sensor_no_disponible',
                "El sensor \"{$sensor->nombre}\" está {$sensor->conexion->value}; su lectura no se puede usar.",
            );
        }

        $cambio = $sensor->presencia !== $presencia;

        $sensor->presencia = $presencia;
        $sensor->conteo_personas = $conteoPersonas;
        $sensor->ultima_lectura = now();

        if ($cambio) {
            $sensor->presencia_desde = now();
        }

        $sensor->save();

        if ($cambio) {
            $this->eventos->registrar(
                TipoEvento::SensorPresencia,
                $origen,
                $presencia ? "Sensor \"{$sensor->nombre}\": presencia detectada." : "Sensor \"{$sensor->nombre}\": sin presencia.",
                $sensor,
                array_filter(['presencia' => $presencia, 'conteo_personas' => $conteoPersonas], fn ($valor) => $valor !== null),
            );
        }

        return $cambio;
    }

    /** Devuelve true si la conexión cambió. Al dejar de estar activo se descarta su última lectura. */
    public function cambiarConexion(Sensor $sensor, EstadoConexion $conexion, OrigenEvento $origen): bool
    {
        if ($sensor->conexion === $conexion) {
            return false;
        }

        $anterior = $sensor->conexion;
        $sensor->conexion = $conexion;

        if ($conexion !== EstadoConexion::Activo) {
            // Un sensor en falla no debe decir "vacío" con un dato viejo.
            $sensor->fill(['presencia' => null, 'presencia_desde' => null, 'conteo_personas' => null]);
        }

        $sensor->save();

        $this->eventos->registrar(
            TipoEvento::SensorConexion,
            $origen,
            "Sensor \"{$sensor->nombre}\": {$anterior->value} → {$conexion->value}.",
            $sensor,
            ['conexion_anterior' => $anterior->value, 'conexion' => $conexion->value],
            match ($conexion) {
                EstadoConexion::Falla => SeveridadEvento::Error,
                EstadoConexion::Inactivo => SeveridadEvento::Advertencia,
                EstadoConexion::Activo => SeveridadEvento::Info,
            },
        );

        return true;
    }
}

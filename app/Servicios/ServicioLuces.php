<?php

namespace App\Servicios;

use App\Drivers\DriverHardware;
use App\Drivers\RespuestaActuador;
use App\Enums\AccionLuz;
use App\Enums\EstadoConexion;
use App\Enums\EstadoLuz;
use App\Enums\EstadoOrden;
use App\Enums\ModoZona;
use App\Enums\OrigenEvento;
use App\Enums\SeveridadEvento;
use App\Enums\TipoEvento;
use App\Exceptions\ComandoRechazado;
use App\Models\Actuador;
use App\Models\Luz;
use App\Models\Regla;
use App\Models\Zona;
use Illuminate\Support\Facades\DB;

/** Reglas de negocio de las órdenes a las luces y de la respuesta de los servos. */
class ServicioLuces
{
    public function __construct(
        private readonly RegistroEventos $eventos,
        private readonly ServicioZonas $zonas,
        private readonly DriverHardware $driver,
    ) {}

    /** @throws ComandoRechazado */
    public function comandarLuz(Luz $luz, AccionLuz $accion, OrigenEvento $origen, ?Regla $regla = null): ResultadoComando
    {
        try {
            return DB::transaction(fn () => $this->aplicar($luz, $accion, $origen, $regla));
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
                $resultados[] = ['luz_id' => $luz->id, 'resultado' => $resultado->resultado(), 'mensaje' => $resultado->mensaje];
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

    /**
     * Para el motor de reglas: true solo si la orden haría algo y el servo puede recibirla.
     * Tampoco reintenta una orden que ya falló (estado real desconocido): así una regla
     * no llena el historial de errores repetidos. El usuario sí puede reintentarla.
     */
    public function requiereAccion(Luz $luz, AccionLuz $accion): bool
    {
        $actuador = $luz->actuador;
        $objetivo = $accion->estadoObjetivo();

        return $actuador !== null
            && $actuador->conexion === EstadoConexion::Activo
            && ! $actuador->ocupado
            && ! $this->yaEstaEn($luz, $objetivo)
            && ! ($luz->estado_real === EstadoLuz::Desconocida && $luz->estado_deseado === $objetivo);
    }

    /** Revisa una orden pendiente: la confirma, la marca fallida o la vence por tiempo de espera. */
    public function revisarPendiente(Actuador $actuador): void
    {
        DB::transaction(function () use ($actuador) {
            $actuador = Actuador::query()->with('luz')->lockForUpdate()->find($actuador->getKey());
            $accion = $actuador?->orden_pendiente;

            if ($accion === null) {
                return;
            }

            $luz = $actuador->luz;
            if ($luz === null) {
                $this->liberar($actuador, 'La orden se canceló porque el servo ya no tiene luz asignada.');

                return;
            }

            $respuesta = $this->driver->consultarPendiente($actuador);
            $espera = config('lumiclass.servo.segundos_espera_confirmacion');

            if ($respuesta->estado === EstadoOrden::Pendiente && $actuador->orden_iniciada_en->diffInSeconds(now()) >= $espera) {
                $mensaje = "El servo \"{$actuador->nombre}\" no confirmó la orden en {$espera} s; el estado de la luz \"{$luz->nombre}\" es desconocido.";
                $luz->estado_real = EstadoLuz::Desconocida;
                $luz->save();
                $this->liberar($actuador, $mensaje);
                $this->eventos->registrar(TipoEvento::ActuadorSinRespuesta, OrigenEvento::Sistema, $mensaje, $actuador, ['luz_id' => $luz->id, 'accion' => $accion->value], SeveridadEvento::Error);

                return;
            }

            if ($respuesta->estado !== EstadoOrden::Pendiente) {
                $luz->setRelation('actuador', $actuador);
                $this->aplicarRespuesta($luz, $accion, $respuesta, OrigenEvento::Sistema, true);
            }
        });
    }

    private function aplicar(Luz $luz, AccionLuz $accion, OrigenEvento $origen, ?Regla $regla): ResultadoComando
    {
        $luz = Luz::query()->with(['actuador', 'zona'])->lockForUpdate()->findOrFail($luz->getKey());
        $objetivo = $accion->estadoObjetivo();

        $this->validarActuador($luz);

        // Una orden manual sobre una zona automática la pasa a manual (si no, una regla la revertiría).
        // Va antes de "ya está así": pulsar "Encender" con la luz encendida también significa "déjala encendida".
        if ($origen === OrigenEvento::Usuario && $luz->zona->modo === ModoZona::Automatico) {
            $this->zonas->cambiarModo($luz->zona, ModoZona::Manual, $origen, 'Motivo: orden manual sobre una luz.');
        }

        if ($this->yaEstaEn($luz, $objetivo)) {
            return new ResultadoComando($luz, null, "La luz \"{$luz->nombre}\" ya está {$objetivo->value}; no se movió el servo.");
        }

        $luz->estado_deseado = $objetivo;
        $luz->save();

        $respuesta = $this->driver->accionar($luz->actuador, $accion);

        $this->eventos->registrar(
            TipoEvento::LuzComando,
            $origen,
            $regla
                ? "Regla \"{$regla->nombre}\": orden \"{$accion->value}\" para la luz \"{$luz->nombre}\"."
                : "Orden \"{$accion->value}\" para la luz \"{$luz->nombre}\".",
            $luz,
            array_filter([
                'accion' => $accion->value,
                'resultado' => $respuesta->estado->value,
                'regla_id' => $regla?->id,
            ], fn ($valor) => $valor !== null),
        );

        $this->aplicarRespuesta($luz, $accion, $respuesta, $origen, false);

        return new ResultadoComando($luz->fresh(['actuador', 'zona']), $respuesta->estado, $respuesta->mensaje);
    }

    private function aplicarRespuesta(Luz $luz, AccionLuz $accion, RespuestaActuador $respuesta, OrigenEvento $origen, bool $eraPendiente): void
    {
        $actuador = $luz->actuador;

        switch ($respuesta->estado) {
            case EstadoOrden::Completada:
                $luz->estado_real = $accion->estadoObjetivo();
                $luz->save();
                $this->liberar($actuador, 'ok');

                if ($eraPendiente) {
                    $this->eventos->registrar(TipoEvento::LuzConfirmada, $origen, "La luz \"{$luz->nombre}\" quedó {$luz->estado_real->value}.", $luz, ['accion' => $accion->value]);
                }
                break;

            case EstadoOrden::Pendiente:
                $actuador->fill(['ocupado' => true, 'orden_pendiente' => $accion, 'orden_iniciada_en' => now()])->save();
                break;

            case EstadoOrden::Fallida:
                $luz->estado_real = EstadoLuz::Desconocida;
                $luz->save();
                $this->liberar($actuador, $respuesta->mensaje);
                $this->eventos->registrar(
                    TipoEvento::ActuadorFalla,
                    $origen,
                    "Servo \"{$actuador->nombre}\": {$respuesta->mensaje}",
                    $actuador,
                    ['luz_id' => $luz->id, 'accion' => $accion->value],
                    SeveridadEvento::Error,
                );
                break;
        }
    }

    private function liberar(Actuador $actuador, string $resultado): void
    {
        $actuador->fill([
            'ocupado' => false,
            'orden_pendiente' => null,
            'orden_iniciada_en' => null,
            'ultimo_resultado' => $resultado,
        ])->save();
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

    /** Si el estado real es desconocido, la orden sí se envía: es la forma de recuperar la luz. */
    private function yaEstaEn(Luz $luz, EstadoLuz $objetivo): bool
    {
        return $luz->estado_real === $objetivo;
    }
}

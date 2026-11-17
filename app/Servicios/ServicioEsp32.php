<?php

namespace App\Servicios;

use App\Drivers\ClienteEsp32;
use App\Enums\EstadoConexion;
use App\Enums\EstadoLuz;
use App\Enums\OrigenEvento;
use App\Enums\SeveridadEvento;
use App\Enums\TipoEvento;
use App\Models\Actuador;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Mantiene la app al día con cada ESP32: si está conectado y si el relé cambió por fuera
 * (por ejemplo, desde la página web del propio ESP32).
 * - ESP32 local: el servidor le pregunta su estado (/estado) cada "segundos_sincronizar".
 * - ESP32 por internet: la placa llama a latido(); si deja de llamar, queda inactivo.
 */
class ServicioEsp32
{
    public function __construct(
        private readonly ClienteEsp32 $cliente,
        private readonly RegistroEventos $eventos,
        private readonly ServicioLuces $luces,
    ) {}

    /** Para el tick. Devuelve cuántos ESP32 revisó. */
    public function sincronizarTodos(): int
    {
        $segundos = max(1, (int) config('lumiclass.esp32.segundos_sincronizar'));
        $revisados = 0;

        Actuador::query()->whereNotNull('direccion')->whereNull('clave_hash')->whereNull('orden_pendiente')->where('ocupado', false)
            ->each(function (Actuador $actuador) use ($segundos, &$revisados) {
                if (Cache::add("lumiclass.esp32.revisado.{$actuador->id}", true, $segundos)) {
                    $this->sincronizar($actuador);
                    $revisados++;
                }
            });

        // Por internet: sin latido reciente, se da por desconectado.
        $limite = now()->subSeconds((int) config('lumiclass.esp32.segundos_sin_latido'));
        Actuador::query()->whereNotNull('clave_hash')->where('conexion', EstadoConexion::Activo->value)
            ->where(fn ($q) => $q->whereNull('ultima_respuesta_en')->orWhere('ultima_respuesta_en', '<', $limite))
            ->each(function (Actuador $actuador) use (&$revisados) {
                $this->cambiarConexion($actuador->load('luz'), EstadoConexion::Inactivo, "El ESP32 de \"{$this->nombreLuz($actuador)}\" dejó de conectarse al servidor.");
                $revisados++;
            });

        return $revisados;
    }

    /**
     * ESP32 local: le pregunta su estado ahora y actualiza conexión y luz.
     * ESP32 por internet: informa lo último que la placa reportó.
     *
     * @return array{conectado: bool, encendido: bool|null, mensaje: string}
     */
    public function sincronizar(Actuador $actuador): array
    {
        if ($actuador->esp32PorInternet()) {
            return $this->resumenRemoto($actuador->fresh());
        }

        if (! $actuador->esp32Local()) {
            return ['conectado' => false, 'encendido' => null, 'mensaje' => 'Esta luz no tiene ESP32.'];
        }

        $encendido = $this->cliente->estado($actuador->direccion);

        return DB::transaction(function () use ($actuador, $encendido) {
            $actuador = Actuador::query()->with('luz')->lockForUpdate()->find($actuador->getKey());
            if ($actuador === null) {
                return ['conectado' => false, 'encendido' => null, 'mensaje' => 'La luz ya no existe.'];
            }

            if ($encendido === null) {
                $this->cambiarConexion($actuador, EstadoConexion::Inactivo, "El ESP32 de \"{$this->nombreLuz($actuador)}\" ({$actuador->direccion}) dejó de responder.");

                return [
                    'conectado' => false,
                    'encendido' => null,
                    'mensaje' => "No hay respuesta de {$actuador->direccion}. Revisa que el ESP32 esté encendido y en la misma red WiFi que este servidor. "
                        .'Si la app está en un hosting, usa la conexión "por internet".',
                ];
            }

            $actuador->fill(['ultima_respuesta_en' => now(), 'estado_reportado' => $encendido]);
            $this->cambiarConexion($actuador, EstadoConexion::Activo, "El ESP32 de \"{$this->nombreLuz($actuador)}\" ({$actuador->direccion}) está conectado.");
            $actuador->save();

            $this->actualizarLuz($actuador, $encendido);

            return ['conectado' => true, 'encendido' => $encendido, 'mensaje' => 'Conectado. El relé está '.($encendido ? 'encendido' : 'apagado').'.'];
        });
    }

    /**
     * Latido del ESP32 por internet: informa el estado del relé y recibe la orden pendiente.
     *
     * @return array{orden: string|null, intervalo: int}
     */
    public function latido(Actuador $actuador, bool $encendido): array
    {
        DB::transaction(function () use ($actuador, $encendido) {
            $actuador = Actuador::query()->with('luz')->lockForUpdate()->find($actuador->getKey());

            $actuador->fill(['ultima_respuesta_en' => now(), 'estado_reportado' => $encendido]);
            $this->cambiarConexion($actuador, EstadoConexion::Activo, "El ESP32 de \"{$this->nombreLuz($actuador)}\" se conectó al servidor.");
            $actuador->save();

            // Sin orden en curso, lo que dice la placa es el estado real de la luz.
            if ($actuador->orden_pendiente === null) {
                $this->actualizarLuz($actuador, $encendido);
            }
        });

        // Con orden en curso: si el relé ya quedó como se pidió, se confirma ahora mismo.
        $actuador->refresh();
        if ($actuador->orden_pendiente !== null) {
            $this->luces->revisarPendiente($actuador);
            $actuador->refresh();
        }

        return [
            'orden' => match ($actuador->orden_pendiente?->value) {
                'encender' => 'on',
                'apagar' => 'off',
                default => null,
            },
            'intervalo' => (int) config('lumiclass.esp32.segundos_latido'),
        ];
    }

    /** @return array{conectado: bool, encendido: bool|null, mensaje: string} */
    private function resumenRemoto(Actuador $actuador): array
    {
        if ($actuador->ultima_respuesta_en === null) {
            return ['conectado' => false, 'encendido' => null, 'mensaje' => 'El ESP32 todavía no se ha conectado. Carga el sketch con la clave y enciéndelo.'];
        }

        $conectado = $actuador->conexion === EstadoConexion::Activo;
        $hace = $actuador->ultima_respuesta_en->diffForHumans();

        return [
            'conectado' => $conectado,
            'encendido' => $actuador->estado_reportado,
            'mensaje' => $conectado
                ? 'Conectado por internet. El relé está '.($actuador->estado_reportado ? 'encendido' : 'apagado').'.'
                : "Sin conexión: el ESP32 se conectó por última vez {$hace}.",
        ];
    }

    private function cambiarConexion(Actuador $actuador, EstadoConexion $conexion, string $mensaje): void
    {
        if ($actuador->conexion === $conexion) {
            return;
        }

        $actuador->conexion = $conexion;
        $actuador->save();

        $this->eventos->registrar(
            TipoEvento::ActuadorConexion,
            OrigenEvento::Sistema,
            $mensaje,
            $actuador,
            array_filter(['conexion' => $conexion->value, 'direccion' => $actuador->direccion]),
            $conexion === EstadoConexion::Activo ? SeveridadEvento::Info : SeveridadEvento::Error,
        );
    }

    /** Si el relé no coincide con lo que la app cree, manda lo que dice el ESP32 (es el dato real). */
    private function actualizarLuz(Actuador $actuador, bool $encendido): void
    {
        $luz = $actuador->luz;
        $estado = $encendido ? EstadoLuz::Encendida : EstadoLuz::Apagada;

        if ($luz === null || $luz->estado_real === $estado) {
            return;
        }

        // Si estaba desconocida, solo se recupera el dato; si no, alguien la cambió por fuera de la app.
        $eraDesconocida = $luz->estado_real === EstadoLuz::Desconocida;
        $luz->estado_real = $estado;
        $luz->save();

        $this->eventos->registrar(
            $eraDesconocida ? TipoEvento::LuzConfirmada : TipoEvento::LuzInterruptor,
            OrigenEvento::Sistema,
            $eraDesconocida
                ? "El ESP32 informó que la luz \"{$luz->nombre}\" está {$estado->value}."
                : "La luz \"{$luz->nombre}\" quedó {$estado->value} desde fuera de la app (página o botón del ESP32).",
            $luz,
            ['estado_real' => $estado->value],
        );
    }

    private function nombreLuz(Actuador $actuador): string
    {
        return $actuador->luz?->nombre ?? $actuador->nombre;
    }
}

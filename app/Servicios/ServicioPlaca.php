<?php

namespace App\Servicios;

use App\Drivers\DriverReal;
use App\Enums\EstadoConexion;
use App\Enums\OrigenEvento;
use App\Enums\SeveridadEvento;
use App\Enums\TipoEvento;
use App\Exceptions\ComandoRechazado;
use App\Models\Actuador;
use App\Models\Placa;
use App\Models\Salon;
use App\Models\Sensor;
use App\Models\Zona;
use Illuminate\Support\Facades\DB;

/**
 * Lo que hace la placa ESP32 de un salón: heartbeat, lecturas de los PIR, órdenes de los servos
 * y sus confirmaciones. También la clave de la placa y la revisión de placas sin contacto.
 */
class ServicioPlaca
{
    public function __construct(
        private readonly ServicioSensores $sensores,
        private readonly ServicioLuces $luces,
        private readonly MotorReglas $motor,
        private readonly RegistroEventos $eventos,
    ) {}

    /** Crea o reemplaza la clave. Devuelve la clave en texto: se muestra UNA vez y no se guarda. */
    public function generarClave(Salon $salon): string
    {
        $clave = Placa::nuevaClave();
        $placa = $salon->placa()->first();

        if ($placa === null) {
            $salon->placa()->create(['clave_hash' => Placa::hashDe($clave)]);
            $mensaje = 'Clave de la placa generada.';
        } else {
            $placa->update(['clave_hash' => Placa::hashDe($clave)]);
            $mensaje = 'Clave de la placa regenerada: la clave anterior ya no sirve.';
        }

        $this->eventos->registrar(TipoEvento::Configuracion, OrigenEvento::Usuario, $mensaje, salon: $salon);

        return $clave;
    }

    /** Heartbeat: marca la placa en línea. Si estaba desconectada, reactiva sus sensores y servos. */
    public function heartbeat(Placa $placa, ?string $ip, ?string $versionFirmware): void
    {
        DB::transaction(function () use ($placa, $ip, $versionFirmware) {
            $volvio = ! $placa->en_linea;

            $placa->fill([
                'en_linea' => true,
                'ultimo_contacto' => now(),
                'ip' => $ip,
                'version_firmware' => $versionFirmware ?? $placa->version_firmware,
            ])->save();

            if ($volvio) {
                $this->cambiarConexionDeTodo($placa->salon, EstadoConexion::Inactivo, EstadoConexion::Activo);
                $this->eventos->registrar(TipoEvento::PlacaConexion, OrigenEvento::Placa, 'Placa en línea.', $placa->salon, ['ip' => $ip], salon: $placa->salon);
            }
        });
    }

    /**
     * Registra la presencia de cada PIR (por su número en la placa) y evalúa las reglas de las zonas que cambiaron.
     *
     * @param  list<array{sensor: int, presencia: bool}>  $lecturas
     * @return array{aplicadas: int, ignoradas: list<array{sensor: int, motivo: string}>, ordenes_reglas: int}
     */
    public function registrarLecturas(Placa $placa, array $lecturas): array
    {
        $sensores = Sensor::query()
            ->whereHas('zona', fn ($q) => $q->where('salon_id', $placa->salon_id))
            ->whereNotNull('numero_en_placa')
            ->get()
            ->keyBy('numero_en_placa');

        $aplicadas = 0;
        $ignoradas = [];
        $zonas = [];

        foreach ($lecturas as $lectura) {
            $numero = (int) $lectura['sensor'];
            $sensor = $sensores->get($numero);

            if ($sensor === null) {
                $ignoradas[] = ['sensor' => $numero, 'motivo' => 'El salón no tiene un sensor con ese número.'];

                continue;
            }

            try {
                $this->sensores->registrarLectura($sensor, (bool) $lectura['presencia'], null, OrigenEvento::Placa);
                $aplicadas++;
                $zonas[$sensor->zona_id] = true;
            } catch (ComandoRechazado $rechazo) {
                $ignoradas[] = ['sensor' => $numero, 'motivo' => $rechazo->getMessage()];
            }
        }

        $ordenes = 0;
        foreach (Zona::query()->whereIn('id', array_keys($zonas))->get() as $zona) {
            $ordenes += $this->motor->evaluarZona($zona);
        }

        return ['aplicadas' => $aplicadas, 'ignoradas' => $ignoradas, 'ordenes_reglas' => $ordenes];
    }

    /**
     * Órdenes que la placa debe ejecutar: las pendientes sin confirmar de sus servos.
     *
     * @return list<array{codigo: string, servo: int, accion: string}>
     */
    public function ordenesPendientes(Placa $placa): array
    {
        return Actuador::query()
            ->where('salon_id', $placa->salon_id)
            ->whereNotNull('orden_pendiente')
            ->whereNotNull('orden_codigo')
            ->whereNull('confirmacion_resultado')
            ->whereNotNull('numero_en_placa')
            ->orderBy('orden_iniciada_en')
            ->get()
            ->map(fn (Actuador $actuador) => [
                'codigo' => $actuador->orden_codigo,
                'servo' => $actuador->numero_en_placa,
                'accion' => $actuador->orden_pendiente->value,
            ])
            ->all();
    }

    /**
     * Resultado de una orden. Devuelve "aplicada" o "ignorada" (código viejo o repetido:
     * la orden ya se resolvió o venció). Ignorarla le dice a la placa que no reintente.
     */
    public function confirmar(Placa $placa, string $codigo, string $resultado, ?string $mensaje): string
    {
        /** @var Actuador|null $actuador */
        $actuador = Actuador::query()
            ->where('salon_id', $placa->salon_id)
            ->where('orden_codigo', $codigo)
            ->whereNull('confirmacion_resultado')
            ->first();

        if ($actuador === null) {
            return 'ignorada';
        }

        $actuador->fill([
            'confirmacion_resultado' => $resultado === DriverReal::RESULTADO_OK ? DriverReal::RESULTADO_OK : DriverReal::RESULTADO_FALLA,
            'confirmacion_mensaje' => $mensaje !== null ? mb_substr($mensaje, 0, 200) : null,
        ])->save();

        $this->luces->revisarPendiente($actuador);

        return 'aplicada';
    }

    /**
     * Placas sin heartbeat en 30 s: quedan desconectadas y sus sensores y servos "inactivos".
     * Lo ejecuta el tick. Devuelve cuántas placas se desconectaron.
     */
    public function revisarDesconectadas(): int
    {
        $limite = now()->subSeconds(Placa::segundosSinContacto());
        $placas = Placa::query()->where('en_linea', true)->where('ultimo_contacto', '<', $limite)->with('salon')->get();

        foreach ($placas as $placa) {
            DB::transaction(function () use ($placa) {
                $placa->update(['en_linea' => false]);
                $this->cambiarConexionDeTodo($placa->salon, EstadoConexion::Activo, EstadoConexion::Inactivo);
                $this->eventos->registrar(
                    TipoEvento::PlacaConexion,
                    OrigenEvento::Sistema,
                    'Placa desconectada: sin contacto en '.Placa::segundosSinContacto().' s. Sus sensores y servos quedan inactivos.',
                    $placa->salon,
                    [],
                    SeveridadEvento::Error,
                    $placa->salon,
                );
            });

            // Con los sensores inactivos la ocupación pasa a "sin datos": las reglas lo ven en seguida.
            $placa->salon->zonas()->each(fn (Zona $zona) => $this->motor->evaluarZona($zona));
        }

        return $placas->count();
    }

    /** Pasa de $desde a $hasta los sensores y servos del salón. Un sensor o servo en "falla" no se toca. */
    private function cambiarConexionDeTodo(Salon $salon, EstadoConexion $desde, EstadoConexion $hasta): void
    {
        $sensores = Sensor::query()->whereHas('zona', fn ($q) => $q->where('salon_id', $salon->id))->where('conexion', $desde)->get();

        foreach ($sensores as $sensor) {
            $this->sensores->cambiarConexion($sensor, $hasta, OrigenEvento::Sistema);
        }

        foreach ($salon->actuadores()->where('conexion', $desde)->get() as $actuador) {
            $actuador->update(['conexion' => $hasta]);
            $this->eventos->registrar(
                TipoEvento::ActuadorConexion,
                OrigenEvento::Sistema,
                "Servo \"{$actuador->nombre}\": {$desde->value} → {$hasta->value}.",
                $actuador,
                ['conexion_anterior' => $desde->value, 'conexion' => $hasta->value],
                $hasta === EstadoConexion::Activo ? SeveridadEvento::Info : SeveridadEvento::Advertencia,
            );
        }
    }
}

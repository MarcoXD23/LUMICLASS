<?php

namespace App\Servicios;

use App\Enums\EstadoLuz;
use App\Enums\ModoZona;
use App\Enums\OrigenEvento;
use App\Enums\TipoEvento;
use App\Exceptions\ComandoRechazado;
use App\Models\Actuador;
use App\Models\Luz;
use App\Models\Salon;
use App\Models\Sensor;
use App\Models\Zona;
use Illuminate\Support\Facades\DB;

/**
 * Configurar un salón después de creado: agregar, renombrar, mover y quitar zonas, luces (con su servo) y sensores.
 * Cada cambio queda en el historial como "configuracion".
 */
class ConfiguracionSalon
{
    /** Límites PROPUESTA: suficientes para un salón y evitan que una cuenta llene la base. */
    public const MAXIMO_ZONAS = 10;

    public const MAXIMO_LUCES_POR_ZONA = 10;

    public const MAXIMO_SENSORES_POR_ZONA = 3;

    public function __construct(
        private readonly RegistroEventos $eventos,
        private readonly RegistroOcupacion $ocupacion,
    ) {}

    public function crearZona(Salon $salon, string $nombre, int $luces, int $sensores): Zona
    {
        if ($salon->zonas()->count() >= self::MAXIMO_ZONAS) {
            throw new ComandoRechazado('limite_zonas', 'El salón ya tiene el máximo de '.self::MAXIMO_ZONAS.' zonas.');
        }

        return DB::transaction(function () use ($salon, $nombre, $luces, $sensores) {
            $zona = $salon->zonas()->create(['nombre' => $nombre, 'modo' => ModoZona::Automatico]);

            for ($i = 1; $i <= $luces; $i++) {
                $this->crearLuz($zona, $this->nombreLibre($salon, 'luz', "{$nombre} · Luz {$i}"));
            }
            for ($i = 1; $i <= $sensores; $i++) {
                $zona->sensores()->create(['nombre' => $this->nombreLibre($salon, 'sensor', "{$nombre} · Sensor PIR {$i}"), 'tipo' => 'pir']);
            }

            $this->registrar($salon, $zona, "Zona \"{$nombre}\" creada con {$luces} luz(ces) y {$sensores} sensor(es).");

            return $zona;
        });
    }

    public function renombrarZona(Zona $zona, string $nombre): void
    {
        $anterior = $zona->nombre;
        $zona->update(['nombre' => $nombre]);
        $this->registrar($zona->salon, $zona, "Zona \"{$anterior}\" renombrada a \"{$nombre}\".");
    }

    /** Borra la zona con sus luces, servos, sensores y las reglas que eran solo de ella. */
    public function quitarZona(Zona $zona): void
    {
        $salon = $zona->salon;

        if ($salon->zonas()->count() <= 1) {
            throw new ComandoRechazado('ultima_zona', 'El salón debe tener al menos una zona. Agrega otra antes de quitar esta.');
        }
        $this->exigirServosLibres($zona->luces()->with('actuador')->get());

        DB::transaction(function () use ($zona, $salon) {
            $servos = $zona->luces()->pluck('actuador_id')->filter();
            $nombre = $zona->nombre;
            $zona->delete(); // en cascada: luces, sensores, reglas de la zona y su historia de estados
            Actuador::query()->whereIn('id', $servos)->delete();

            $this->registrar($salon, null, "Zona \"{$nombre}\" quitada con sus luces, servos y sensores.");
        });
    }

    public function agregarLuz(Zona $zona, string $nombre): Luz
    {
        if ($zona->luces()->count() >= self::MAXIMO_LUCES_POR_ZONA) {
            throw new ComandoRechazado('limite_luces', 'La zona ya tiene el máximo de '.self::MAXIMO_LUCES_POR_ZONA.' luces.');
        }

        return DB::transaction(function () use ($zona, $nombre) {
            $luz = $this->crearLuz($zona, $nombre);
            $this->registrar($zona->salon, $luz, "Luz \"{$nombre}\" agregada a \"{$zona->nombre}\" con el servo \"{$luz->actuador->nombre}\".");

            return $luz;
        });
    }

    /** Renombra y/o mueve una luz a otra zona del mismo salón (eso lo valida GuardarLuzRequest). */
    public function editarLuz(Luz $luz, ?string $nombre, ?Zona $destino): Luz
    {
        $cambios = [];

        if ($nombre !== null && $nombre !== $luz->nombre) {
            $cambios[] = "renombrada de \"{$luz->nombre}\" a \"{$nombre}\"";
            $luz->nombre = $nombre;
        }

        if ($destino !== null && $destino->id !== $luz->zona_id) {
            $this->exigirServosLibres(collect([$luz->loadMissing('actuador')]));
            if ($destino->luces()->count() >= self::MAXIMO_LUCES_POR_ZONA) {
                throw new ComandoRechazado('limite_luces', "La zona \"{$destino->nombre}\" ya tiene el máximo de ".self::MAXIMO_LUCES_POR_ZONA.' luces.');
            }
            $cambios[] = "movida de \"{$luz->zona->nombre}\" a \"{$destino->nombre}\"";
            $luz->zona_id = $destino->id;
        }

        if ($cambios) {
            $luz->save();
            $this->registrar($luz->zona()->first()->salon, $luz, "Luz \"{$luz->nombre}\" ".implode(' y ', $cambios).'.');
        }

        return $luz->fresh('actuador');
    }

    /** Quita la luz con su servo. Su historia de horas encendidas también se borra. */
    public function quitarLuz(Luz $luz): void
    {
        $this->exigirServosLibres(collect([$luz->loadMissing('actuador')]));
        $salon = $luz->zona->salon;

        DB::transaction(function () use ($luz, $salon) {
            $servo = $luz->actuador;
            $nombre = $luz->nombre;
            $luz->delete();
            $servo?->delete();

            $this->registrar($salon, null, "Luz \"{$nombre}\" quitada junto con su servo.");
        });
    }

    public function agregarSensor(Zona $zona, string $nombre): Sensor
    {
        if ($zona->sensores()->count() >= self::MAXIMO_SENSORES_POR_ZONA) {
            throw new ComandoRechazado('limite_sensores', 'La zona ya tiene el máximo de '.self::MAXIMO_SENSORES_POR_ZONA.' sensores.');
        }

        $sensor = $zona->sensores()->create(['nombre' => $nombre, 'tipo' => 'pir']);
        $this->registrar($zona->salon, $sensor, "Sensor \"{$nombre}\" agregado a \"{$zona->nombre}\".");

        return $sensor;
    }

    public function renombrarSensor(Sensor $sensor, string $nombre): void
    {
        $anterior = $sensor->nombre;
        $sensor->update(['nombre' => $nombre]);
        $this->registrar($sensor->zona->salon, $sensor, "Sensor \"{$anterior}\" renombrado a \"{$nombre}\".");
    }

    /**
     * Sin sensores, una zona en automático ya no puede saber si hay gente y sus reglas dejan de actuar:
     * por eso quitar el último pide confirmación explícita.
     */
    public function quitarSensor(Sensor $sensor, bool $confirmado): void
    {
        $zona = $sensor->zona;

        if (! $confirmado && $zona->modo === ModoZona::Automatico && $zona->sensores()->count() === 1) {
            throw new ComandoRechazado(
                'ultimo_sensor',
                "Es el único sensor de \"{$zona->nombre}\", que está en automático: sin sensor, sus reglas dejan de actuar. ¿Quitarlo igual?",
            );
        }

        $nombre = $sensor->nombre;
        $sensor->delete();
        $this->ocupacion->actualizar($zona);
        $this->registrar($zona->salon, null, "Sensor \"{$nombre}\" quitado de \"{$zona->nombre}\".");
    }

    private function crearLuz(Zona $zona, string $nombre): Luz
    {
        $servo = $zona->salon->actuadores()->create(['nombre' => 'Servo '.$this->siguienteServo($zona->salon)]);

        return $zona->luces()->create([
            'nombre' => $nombre,
            'actuador_id' => $servo->id,
            // En la simulación se sabe que una luz nueva empieza apagada; con hardware real no.
            'estado_real' => config('lumiclass.driver') === 'simulado' ? EstadoLuz::Apagada : EstadoLuz::Desconocida,
        ])->load('actuador');
    }

    /** "Servo N" con N = el mayor número usado en el salón + 1 (no se repite aunque se hayan borrado servos). */
    private function siguienteServo(Salon $salon): int
    {
        return $salon->actuadores()->pluck('nombre')
            ->map(fn (string $nombre) => preg_match('/(\d+)$/', $nombre, $m) ? (int) $m[1] : 0)
            ->max() + 1;
    }

    /** Si el nombre ya existe en el salón, le agrega " (2)", " (3)"… (solo para los nombres automáticos). */
    private function nombreLibre(Salon $salon, string $tipo, string $nombre): string
    {
        $existentes = ($tipo === 'luz' ? $salon->luces() : $salon->sensores())->pluck($tipo === 'luz' ? 'luces.nombre' : 'sensores.nombre');
        $candidato = $nombre;
        for ($n = 2; $existentes->contains($candidato); $n++) {
            $candidato = "{$nombre} ({$n})";
        }

        return $candidato;
    }

    /** @param  iterable<Luz>  $luces */
    private function exigirServosLibres(iterable $luces): void
    {
        foreach ($luces as $luz) {
            if ($luz->actuador?->ocupado) {
                throw new ComandoRechazado(
                    'actuador_ocupado',
                    "El servo de \"{$luz->nombre}\" está ejecutando una orden. Espera unos segundos e intenta de nuevo.",
                );
            }
        }
    }

    private function registrar(Salon $salon, $entidad, string $mensaje): void
    {
        $this->eventos->registrar(TipoEvento::Configuracion, OrigenEvento::Usuario, $mensaje, $entidad, [], salon: $salon);
    }
}

<?php

namespace App\Drivers;

use App\Enums\AccionLuz;
use App\Models\Actuador;
use App\Models\Placa;
use Illuminate\Support\Str;

/**
 * Servos reales en la placa ESP32 del salón (Fase 8). La placa no recibe conexiones: ella pregunta.
 * accionar() deja la orden pendiente con un código; la placa la lee en GET /placa/ordenes,
 * mueve el servo y responde en POST /placa/confirmar. consultarPendiente() lee esa respuesta.
 * Si no hay respuesta, ServicioLuces vence la orden con el tiempo de espera de siempre.
 *
 * "ok" significa que el servo se movió. Sin un sensor de luz no se puede saber si la luz prendió.
 */
class DriverReal implements DriverHardware
{
    public const RESULTADO_OK = 'ok';

    public const RESULTADO_FALLA = 'falla';

    public function nombre(): string
    {
        return 'real';
    }

    public function accionar(Actuador $actuador, AccionLuz $accion): RespuestaActuador
    {
        /** @var Placa|null $placa */
        $placa = Placa::query()->where('salon_id', $actuador->salon_id)->first();

        if ($placa === null) {
            return RespuestaActuador::fallida('Este salón no tiene placa. Conéctala en "Configurar salón" → "Conectar placa".');
        }

        if (! $placa->estaEnLinea()) {
            return RespuestaActuador::fallida('La placa del salón está desconectada; la orden no se envió.');
        }

        if ($actuador->numero_en_placa === null) {
            return RespuestaActuador::fallida("El servo \"{$actuador->nombre}\" no tiene número en la placa.");
        }

        $actuador->fill([
            'orden_codigo' => Str::lower(Str::random(12)),
            'confirmacion_resultado' => null,
            'confirmacion_mensaje' => null,
        ])->save();

        return RespuestaActuador::pendiente('Orden enviada a la placa; esperando que el servo se mueva.');
    }

    public function consultarPendiente(Actuador $actuador): RespuestaActuador
    {
        return match ($actuador->confirmacion_resultado) {
            self::RESULTADO_OK => RespuestaActuador::completada('La placa confirmó que el servo se movió (sin sensor de luz no se verifica que la luz cambió).'),
            self::RESULTADO_FALLA => RespuestaActuador::fallida('La placa informó una falla: '.($actuador->confirmacion_mensaje ?: 'sin detalle').'.'),
            default => RespuestaActuador::pendiente(),
        };
    }
}

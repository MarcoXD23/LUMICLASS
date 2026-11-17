<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * Placa ESP32 de un salón (Fase 8). Se identifica con una clave propia que solo se guarda como hash SHA-256:
 * la clave es aleatoria y larga, así que SHA-256 es seguro y rápido (la placa consulta cada segundo).
 */
class Placa extends Model
{
    protected $table = 'placas';

    protected $fillable = ['salon_id', 'clave_hash', 'en_linea', 'ultimo_contacto', 'ip', 'version_firmware'];

    protected $hidden = ['clave_hash'];

    protected function casts(): array
    {
        return [
            'en_linea' => 'boolean',
            'ultimo_contacto' => 'datetime',
        ];
    }

    /** @return BelongsTo<Salon, $this> */
    public function salon(): BelongsTo
    {
        return $this->belongsTo(Salon::class);
    }

    public static function nuevaClave(): string
    {
        return 'lc_'.Str::random(40);
    }

    public static function hashDe(string $clave): string
    {
        return hash('sha256', $clave);
    }

    public static function conClave(?string $clave): ?self
    {
        if ($clave === null || $clave === '' || strlen($clave) > 100) {
            return null;
        }

        return self::query()->where('clave_hash', self::hashDe($clave))->first();
    }

    /** En línea = hubo heartbeat hace menos del tiempo permitido (30 s). */
    public function estaEnLinea(): bool
    {
        return $this->ultimo_contacto !== null
            && $this->ultimo_contacto->greaterThanOrEqualTo(now()->subSeconds(self::segundosSinContacto()));
    }

    /**
     * Lo que muestran el dashboard y "Conectar placa".
     *
     * @return array{configurada: bool, en_linea: bool, ultimo_contacto: ?string, ip: ?string, version_firmware: ?string}
     */
    public static function estado(?self $placa): array
    {
        return [
            'configurada' => $placa !== null,
            'en_linea' => (bool) $placa?->estaEnLinea(),
            'ultimo_contacto' => $placa?->ultimo_contacto?->toIso8601String(),
            'ip' => $placa?->ip,
            'version_firmware' => $placa?->version_firmware,
        ];
    }

    public static function segundosSinContacto(): int
    {
        return (int) config('lumiclass.placa.segundos_sin_contacto', 30);
    }
}

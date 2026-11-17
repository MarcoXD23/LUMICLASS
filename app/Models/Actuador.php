<?php

namespace App\Models;

use App\Enums\AccionLuz;
use App\Enums\EstadoConexion;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

/** Servomotor que acciona mecánicamente un interruptor de pared. */
class Actuador extends Model
{
    use HasFactory;

    protected $table = 'actuadores';

    protected $fillable = ['salon_id', 'nombre', 'direccion', 'conexion', 'ocupado', 'orden_pendiente', 'orden_iniciada_en', 'ultimo_resultado', 'ultima_respuesta_en', 'estado_reportado'];

    protected $attributes = ['conexion' => 'activo', 'ocupado' => false];

    protected $hidden = ['clave_hash'];

    protected function casts(): array
    {
        return [
            'conexion' => EstadoConexion::class,
            'ocupado' => 'boolean',
            'orden_pendiente' => AccionLuz::class,
            'orden_iniciada_en' => 'datetime',
            'ultima_respuesta_en' => 'datetime',
            'estado_reportado' => 'boolean',
        ];
    }

    /** @return BelongsTo<Salon, $this> */
    public function salon(): BelongsTo
    {
        return $this->belongsTo(Salon::class);
    }

    /** @return HasOne<Luz, $this> */
    public function luz(): HasOne
    {
        return $this->hasOne(Luz::class);
    }

    /** true si esta luz se mueve con un ESP32 propio (por IP local o por internet). */
    public function tieneEsp32(): bool
    {
        return $this->esp32Local() || $this->esp32PorInternet();
    }

    /** El servidor llama al ESP32 por su IP: solo sirve si ambos están en la misma red (p. ej. en el PC). */
    public function esp32Local(): bool
    {
        return filled($this->direccion);
    }

    /** El ESP32 llama al servidor con su clave: sirve desde el hosting. */
    public function esp32PorInternet(): bool
    {
        return filled($this->clave_hash);
    }

    /** "local", "internet" o null. */
    public function conexionEsp32(): ?string
    {
        return match (true) {
            $this->esp32PorInternet() => 'internet',
            $this->esp32Local() => 'local',
            default => null,
        };
    }

    public static function hashClave(string $clave): string
    {
        return hash('sha256', $clave);
    }

    public function scopeDelUsuario(Builder $query, ?int $userId): void
    {
        $query->whereHas('salon', fn (Builder $q) => $q->where('user_id', $userId));
    }
}

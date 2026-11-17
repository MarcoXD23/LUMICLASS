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

    protected $fillable = [
        'salon_id', 'nombre', 'numero_en_placa', 'conexion', 'ocupado', 'orden_pendiente', 'orden_iniciada_en', 'ultimo_resultado',
        'orden_codigo', 'confirmacion_resultado', 'confirmacion_mensaje',
    ];

    protected $attributes = ['conexion' => 'activo', 'ocupado' => false];

    protected function casts(): array
    {
        return [
            'conexion' => EstadoConexion::class,
            'numero_en_placa' => 'integer',
            'ocupado' => 'boolean',
            'orden_pendiente' => AccionLuz::class,
            'orden_iniciada_en' => 'datetime',
        ];
    }

    /** Cada servo nuevo recibe el primer número libre de su salón: 1 = primer servo conectado a la placa. */
    protected static function booted(): void
    {
        static::creating(function (Actuador $actuador) {
            if ($actuador->numero_en_placa === null) {
                $actuador->numero_en_placa = NumeroEnPlaca::primeroLibre(
                    self::query()->where('salon_id', $actuador->salon_id)->pluck('numero_en_placa'),
                );
            }
        });
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

    public function scopeDelUsuario(Builder $query, ?int $userId): void
    {
        $query->whereHas('salon', fn (Builder $q) => $q->where('user_id', $userId));
    }
}

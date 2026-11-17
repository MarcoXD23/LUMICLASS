<?php

namespace App\Models;

use App\Enums\EstadoConexion;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Sensor extends Model
{
    use HasFactory;

    protected $table = 'sensores';

    protected $fillable = ['zona_id', 'nombre', 'tipo', 'numero_en_placa', 'conexion', 'presencia', 'presencia_desde', 'conteo_personas', 'ultima_lectura'];

    protected $attributes = ['conexion' => 'activo'];

    protected function casts(): array
    {
        return [
            'conexion' => EstadoConexion::class,
            'presencia' => 'boolean',
            'presencia_desde' => 'datetime',
            'numero_en_placa' => 'integer',
            'conteo_personas' => 'integer',
            'ultima_lectura' => 'datetime',
        ];
    }

    /** Cada sensor nuevo recibe el primer número libre de su salón: 1 = primer PIR conectado a la placa. */
    protected static function booted(): void
    {
        static::creating(function (Sensor $sensor) {
            if ($sensor->numero_en_placa === null) {
                $salonId = Zona::query()->whereKey($sensor->zona_id)->value('salon_id');
                $sensor->numero_en_placa = NumeroEnPlaca::primeroLibre(
                    self::query()->whereHas('zona', fn (Builder $q) => $q->where('salon_id', $salonId))->pluck('numero_en_placa'),
                );
            }
        });
    }

    /** @return BelongsTo<Zona, $this> */
    public function zona(): BelongsTo
    {
        return $this->belongsTo(Zona::class);
    }

    public function scopeDelUsuario(Builder $query, ?int $userId): void
    {
        $query->whereHas('zona.salon', fn (Builder $q) => $q->where('user_id', $userId));
    }
}

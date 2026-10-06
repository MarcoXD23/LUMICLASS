<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Regla de automatización. Formato (PROPUESTA):
 * condicion = {"presencia": "ocupado"|"vacio", "duracion_segundos"?: int}
 * accion    = {"accion": "encender"|"apagar"}
 */
class Regla extends Model
{
    use HasFactory;

    protected $table = 'reglas';

    protected $fillable = ['salon_id', 'zona_id', 'nombre', 'activa', 'prioridad', 'condicion', 'accion'];

    protected function casts(): array
    {
        return [
            'activa' => 'boolean',
            'prioridad' => 'integer',
            'condicion' => 'array',
            'accion' => 'array',
        ];
    }

    /** @return BelongsTo<Salon, $this> */
    public function salon(): BelongsTo
    {
        return $this->belongsTo(Salon::class);
    }

    /** @return BelongsTo<Zona, $this> */
    public function zona(): BelongsTo
    {
        return $this->belongsTo(Zona::class);
    }

    /** Menor número = se evalúa primero. */
    public function scopeOrdenadas(Builder $query): void
    {
        $query->orderBy('prioridad')->orderBy('id');
    }

    public function scopeDelUsuario(Builder $query, ?int $userId): void
    {
        $query->whereHas('salon', fn (Builder $q) => $q->where('user_id', $userId));
    }
}

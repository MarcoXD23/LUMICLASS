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

    protected $fillable = ['zona_id', 'nombre', 'tipo', 'conexion', 'presencia', 'presencia_desde', 'conteo_personas', 'ultima_lectura'];

    protected $attributes = ['conexion' => 'activo'];

    protected function casts(): array
    {
        return [
            'conexion' => EstadoConexion::class,
            'presencia' => 'boolean',
            'presencia_desde' => 'datetime',
            'conteo_personas' => 'integer',
            'ultima_lectura' => 'datetime',
        ];
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

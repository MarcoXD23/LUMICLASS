<?php

namespace App\Models;

use App\Enums\EstadoLuz;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Luz extends Model
{
    use HasFactory;

    protected $table = 'luces';

    protected $fillable = ['zona_id', 'actuador_id', 'nombre', 'estado_deseado', 'estado_real'];

    protected $attributes = ['estado_deseado' => 'apagada', 'estado_real' => 'desconocida'];

    protected function casts(): array
    {
        return [
            'estado_deseado' => EstadoLuz::class,
            'estado_real' => EstadoLuz::class,
        ];
    }

    /** @return BelongsTo<Zona, $this> */
    public function zona(): BelongsTo
    {
        return $this->belongsTo(Zona::class);
    }

    /** @return BelongsTo<Actuador, $this> */
    public function actuador(): BelongsTo
    {
        return $this->belongsTo(Actuador::class);
    }

    public function scopeDelUsuario(Builder $query, ?int $userId): void
    {
        $query->whereHas('zona.salon', fn (Builder $q) => $q->where('user_id', $userId));
    }
}

<?php

namespace App\Models;

use App\Enums\OrigenEvento;
use App\Enums\SeveridadEvento;
use App\Enums\TipoEvento;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Única fuente del historial: no se edita ni se borra desde la API. */
class Evento extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'eventos';

    protected $fillable = ['salon_id', 'tipo', 'origen', 'severidad', 'entidad_tipo', 'entidad_id', 'mensaje', 'datos'];

    protected function casts(): array
    {
        return [
            'tipo' => TipoEvento::class,
            'origen' => OrigenEvento::class,
            'severidad' => SeveridadEvento::class,
            'datos' => 'array',
        ];
    }

    /** @return BelongsTo<Salon, $this> */
    public function salon(): BelongsTo
    {
        return $this->belongsTo(Salon::class);
    }
}

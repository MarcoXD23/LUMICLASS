<?php

namespace App\Models;

use App\Enums\OrigenEvento;
use App\Enums\SeveridadEvento;
use App\Enums\TipoEvento;
use Illuminate\Database\Eloquent\Model;

/** Única fuente del historial: no se edita ni se borra desde la API. */
class Evento extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'eventos';

    protected $fillable = ['tipo', 'origen', 'severidad', 'entidad_tipo', 'entidad_id', 'mensaje', 'datos'];

    protected function casts(): array
    {
        return [
            'tipo' => TipoEvento::class,
            'origen' => OrigenEvento::class,
            'severidad' => SeveridadEvento::class,
            'datos' => 'array',
        ];
    }
}

<?php

namespace App\Models;

use App\Enums\EstadoLuz;
use Illuminate\Database\Eloquent\Model;

/** "Desde created_at, la luz está en este estado real." Lo escribe el modelo Luz al cambiar. */
class CambioLuz extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'cambios_luz';

    protected $fillable = ['luz_id', 'estado', 'created_at'];

    protected function casts(): array
    {
        return ['estado' => EstadoLuz::class];
    }
}

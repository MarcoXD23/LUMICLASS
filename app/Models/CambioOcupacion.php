<?php

namespace App\Models;

use App\Enums\Ocupacion;
use Illuminate\Database\Eloquent\Model;

/** "Desde created_at, la zona está ocupada, vacía o sin datos." Lo escribe RegistroOcupacion. */
class CambioOcupacion extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'cambios_ocupacion';

    protected $fillable = ['zona_id', 'ocupacion', 'created_at'];

    protected function casts(): array
    {
        return ['ocupacion' => Ocupacion::class];
    }
}

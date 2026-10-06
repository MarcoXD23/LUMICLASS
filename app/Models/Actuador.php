<?php

namespace App\Models;

use App\Enums\EstadoConexion;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;

/** Servomotor que acciona mecánicamente un interruptor de pared. */
class Actuador extends Model
{
    use HasFactory;

    protected $table = 'actuadores';

    protected $fillable = ['nombre', 'conexion', 'ocupado', 'ultimo_resultado'];

    protected $attributes = ['conexion' => 'activo', 'ocupado' => false];

    protected function casts(): array
    {
        return [
            'conexion' => EstadoConexion::class,
            'ocupado' => 'boolean',
        ];
    }

    /** @return HasOne<Luz, $this> */
    public function luz(): HasOne
    {
        return $this->hasOne(Luz::class);
    }
}

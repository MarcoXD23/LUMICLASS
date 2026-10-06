<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SolicitudProcesada extends Model
{
    protected $table = 'solicitudes_procesadas';

    protected $fillable = ['user_id', 'id_solicitud', 'ruta', 'codigo_http', 'respuesta'];

    protected function casts(): array
    {
        return [
            'codigo_http' => 'integer',
            'respuesta' => 'array',
        ];
    }
}

<?php

namespace App\Models;

use App\Enums\PropositoCodigo;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Código de 6 dígitos guardado con hash. Se borra al usarlo (sirve una sola vez). */
class CodigoVerificacion extends Model
{
    protected $table = 'codigos_verificacion';

    protected $fillable = ['user_id', 'proposito', 'destino', 'codigo_hash', 'expira_en'];

    protected $hidden = ['codigo_hash'];

    protected function casts(): array
    {
        return [
            'proposito' => PropositoCodigo::class,
            'expira_en' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}

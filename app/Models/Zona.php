<?php

namespace App\Models;

use App\Enums\ModoZona;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Zona extends Model
{
    use HasFactory;

    protected $table = 'zonas';

    protected $fillable = ['salon_id', 'nombre', 'modo'];

    protected $attributes = ['modo' => 'automatico'];

    protected function casts(): array
    {
        return ['modo' => ModoZona::class];
    }

    /** @return BelongsTo<Salon, $this> */
    public function salon(): BelongsTo
    {
        return $this->belongsTo(Salon::class);
    }

    /** @return HasMany<Luz, $this> */
    public function luces(): HasMany
    {
        return $this->hasMany(Luz::class);
    }

    /** @return HasMany<Sensor, $this> */
    public function sensores(): HasMany
    {
        return $this->hasMany(Sensor::class);
    }
}

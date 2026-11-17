<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Salon extends Model
{
    use HasFactory;

    protected $table = 'salones';

    protected $fillable = ['user_id', 'nombre'];

    /** @return BelongsTo<User, $this> */
    public function dueno(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** @return HasMany<Zona, $this> */
    public function zonas(): HasMany
    {
        return $this->hasMany(Zona::class);
    }

    /** @return HasManyThrough<Luz, Zona, $this> */
    public function luces(): HasManyThrough
    {
        return $this->hasManyThrough(Luz::class, Zona::class);
    }

    /** @return HasManyThrough<Sensor, Zona, $this> */
    public function sensores(): HasManyThrough
    {
        return $this->hasManyThrough(Sensor::class, Zona::class);
    }

    /** @return HasMany<Actuador, $this> */
    public function actuadores(): HasMany
    {
        return $this->hasMany(Actuador::class);
    }

    /** @return HasMany<Regla, $this> */
    public function reglas(): HasMany
    {
        return $this->hasMany(Regla::class);
    }

    /** @return HasMany<Evento, $this> */
    public function eventos(): HasMany
    {
        return $this->hasMany(Evento::class);
    }

    public function scopeDelUsuario(Builder $query, ?int $userId): void
    {
        $query->where('user_id', $userId);
    }
}

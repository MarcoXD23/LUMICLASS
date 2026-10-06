<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Salon extends Model
{
    use HasFactory;

    protected $table = 'salones';

    protected $fillable = ['nombre'];

    /** @return HasMany<Zona, $this> */
    public function zonas(): HasMany
    {
        return $this->hasMany(Zona::class);
    }
}

<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'remember_token', 'correo_alternativo', 'correo_alternativo_pendiente'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'correo_alternativo_verificado_en' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /** Solo un correo alternativo verificado sirve para recuperar la contraseña. */
    public function tieneAlternativoVerificado(): bool
    {
        return $this->correo_alternativo !== null && $this->correo_alternativo_verificado_en !== null;
    }

    /** "marco@outlook.com" → "ma***@outlook.com" (para mostrarlo sin exponerlo completo). */
    public static function enmascarar(?string $correo): ?string
    {
        if ($correo === null || ! str_contains($correo, '@')) {
            return null;
        }

        [$usuario, $dominio] = explode('@', $correo, 2);

        return mb_substr($usuario, 0, mb_strlen($usuario) > 2 ? 2 : 1).'***@'.$dominio;
    }

    /** @return HasMany<Salon, $this> */
    public function salones(): HasMany
    {
        return $this->hasMany(Salon::class);
    }
}

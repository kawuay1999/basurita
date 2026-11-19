<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'role',
        'colonia_id', // Agregado para permitir la relación con la tabla colonias
        'failed_login_attempts',
        'locked_until',
        'recovery_code',
        'recovery_code_expires_at',
        'fcm_token',
        'latitud_casa',
        'longitud_casa',
        'direccion_casa',
        'radio_notificacion_metros',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'recovery_code',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed', // Laravel aplica bcrypt automáticamente
            'locked_until' => 'datetime',
            'recovery_code_expires_at' => 'datetime',
        ];
    }

    /**
     * Relación: Un usuario (ciudadano) pertenece a una Colonia.
     */
    public function colonia()
    {
        return $this->belongsTo(Colonia::class);
    }
}
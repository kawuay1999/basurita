<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Colonia extends Model
{
    use HasFactory;

    protected $table = 'colonias';

    protected $fillable = [
        'nombre',
        'zona_o_sector',
        'codigo_postal',
        'activa',
    ];

    protected $casts = [
        'activa' => 'boolean',
    ];

    // Relación: Una colonia tiene muchos usuarios (ciudadanos)
    public function usuarios()
    {
        return $this->hasMany(User::class, 'colonia_id');
    }

    // Relación: Una colonia pertenece a muchas rutas
    public function rutas()
    {
        return $this->belongsToMany(Ruta::class, 'colonia_ruta')->withTimestamps();
    }
}
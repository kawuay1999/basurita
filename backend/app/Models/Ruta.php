<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Ruta extends Model
{
    use HasFactory;

    protected $fillable = ['nombre', 'descripcion', 'activa'];
    protected $casts = ['activa' => 'boolean'];

    // Una ruta tiene muchas colonias
    public function colonias()
    {
        return $this->belongsToMany(Colonia::class, 'colonia_ruta')->withTimestamps();
    }

    // Una ruta tiene muchos horarios
    public function horarios()
    {
        return $this->hasMany(Horario::class);
    }
}
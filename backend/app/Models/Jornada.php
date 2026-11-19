<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Jornada extends Model
{
    use HasFactory;

    protected $fillable = [
        'operador_id',
        'camion_id',
        'ruta_id',
        'fecha',
        'estado',
    ];

    public function operador()
    {
        return $this->belongsTo(User::class, 'operador_id');
    }

    public function camion()
    {
        return $this->belongsTo(Camion::class, 'camion_id');
    }

    public function ruta()
    {
        return $this->belongsTo(Ruta::class, 'ruta_id');
    }

    public function ubicaciones()
    {
        return $this->hasMany(Ubicacion::class, 'jornada_id');
    }

    public function incidencias()
    {
        return $this->hasMany(Incidencia::class, 'jornada_id');
    }
}
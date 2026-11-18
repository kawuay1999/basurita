<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ubicacion extends Model
{
    protected $table = 'ubicaciones';

    protected $fillable = [
        'jornada_id',
        'latitud',
        'longitud',
        'precision_metros',
        'fecha_hora_dispositivo',
    ];

    protected $casts = [
        'fecha_hora_dispositivo' => 'datetime',
    ];

    public function jornada()
    {
        return $this->belongsTo(Jornada::class);
    }
}
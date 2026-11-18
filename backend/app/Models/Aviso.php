<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Aviso extends Model
{
    protected $table = 'avisos';

    protected $fillable = [
        'titulo',
        'mensaje',
        'activo',
        'fecha_expiracion',
    ];

    protected $casts = [
        'activo' => 'boolean',
        'fecha_expiracion' => 'datetime',
    ];
}
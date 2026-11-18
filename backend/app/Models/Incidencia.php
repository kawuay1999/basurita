<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Incidencia extends Model
{
    protected $table = 'incidencias';

    protected $fillable = [
        'jornada_id',
        'tipo',
        'descripcion',
        'foto_path',
        'estado',
    ];

    public function jornada()
    {
        return $this->belongsTo(Jornada::class);
    }
}
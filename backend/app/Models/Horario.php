<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Horario extends Model
{
    protected $fillable = ['ruta_id', 'dia_semana', 'hora_inicio', 'hora_fin'];

    public function ruta()
    {
        return $this->belongsTo(Ruta::class);
    }
}
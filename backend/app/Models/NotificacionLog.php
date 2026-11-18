<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class NotificacionLog extends Model {
    protected $table = 'notificaciones_logs';
    protected $fillable = ['user_id', 'jornada_id'];
}
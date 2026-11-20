<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;

class CalendarioRecoleccion extends Model
{
    protected $table = 'calendarios_recoleccion';

    protected $fillable = ['anio', 'mes', 'ruta_id', 'modo', 'dias_semana', 'dias', 'nota', 'publicado'];

    protected $casts = [
        'anio' => 'integer',
        'mes' => 'integer',
        'dias_semana' => 'array',
        'dias' => 'array',
        'publicado' => 'boolean',
    ];

    public const MODOS = ['pares', 'impares', 'dias_semana', 'personalizado'];

    public function ruta()
    {
        return $this->belongsTo(Ruta::class);
    }

    /**
     * Calcula los días del mes según el modo elegido por el admin.
     *
     * @param int[] $diasSemana 1 = lunes ... 7 = domingo
     * @param int[] $diasPersonalizados días sueltos del mes
     * @return int[]
     */
    public static function calcularDias(int $anio, int $mes, string $modo, array $diasSemana = [], array $diasPersonalizados = []): array
    {
        $total = Carbon::create($anio, $mes, 1)->daysInMonth;
        $dias = [];

        for ($d = 1; $d <= $total; $d++) {
            $incluir = match ($modo) {
                'pares' => $d % 2 === 0,
                'impares' => $d % 2 === 1,
                'dias_semana' => in_array(Carbon::create($anio, $mes, $d)->dayOfWeekIso, $diasSemana, true),
                'personalizado' => in_array($d, $diasPersonalizados, true),
                default => false,
            };
            if ($incluir) {
                $dias[] = $d;
            }
        }

        return $dias;
    }
}

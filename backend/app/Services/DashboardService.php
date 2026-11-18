<?php

namespace App\Services;

use App\Models\Jornada;
use App\Models\Incidencia;
use App\Models\User;
use Carbon\Carbon;

class DashboardService
{
    public function getEstadisticasDelDia(): array
    {
        $hoy = Carbon::today();

        return [
            'unidades_activas' => Jornada::whereDate('fecha', $hoy)->where('estado', 'en_curso')->count(),
            'rutas_completadas' => Jornada::whereDate('fecha', $hoy)->where('estado', 'finalizada')->count(),
            'incidencias_abiertas' => Incidencia::whereIn('estado', ['nueva', 'en_atencion'])->count(),
            'ciudadanos_registrados' => User::where('role', 'ciudadano')->count(),
        ];
    }
}
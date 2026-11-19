<?php

namespace App\Services;

use App\Models\Camion;
use App\Models\Jornada;
use App\Models\Incidencia;
use App\Models\User;
use Carbon\Carbon;

class DashboardService
{
    public function getEstadisticasDelDia(): array
    {
        $hoy = Carbon::today();

        // Camiones que hoy tienen una jornada en curso (están circulando)
        $camionesEnRuta = Jornada::whereDate('fecha', $hoy)
            ->where('estado', 'en_curso')
            ->pluck('camion_id')
            ->unique();

        // Camiones con ruta asignada para hoy que aún no salen
        $camionesProgramados = Jornada::whereDate('fecha', $hoy)
            ->where('estado', 'programada')
            ->pluck('camion_id')
            ->unique()
            ->diff($camionesEnRuta);

        $activos = Camion::where('estado', 'activo')->pluck('id');

        return [
            'unidades_activas' => $camionesEnRuta->count(),
            'rutas_completadas' => Jornada::whereDate('fecha', $hoy)->where('estado', 'finalizada')->count(),
            'incidencias_abiertas' => Incidencia::whereIn('estado', ['nueva', 'en_atencion'])->count(),
            'ciudadanos_registrados' => User::where('role', 'ciudadano')->count(),
            'operadores' => User::where('role', 'operador')->count(),

            // Para la gráfica de estatus de unidades (cada camión cuenta en un solo grupo)
            'camiones_por_estatus' => [
                'en_ruta' => $camionesEnRuta->count(),
                'programado' => $camionesProgramados->intersect($activos)->count(),
                'disponible' => $activos->diff($camionesEnRuta)->diff($camionesProgramados)->count(),
                'mantenimiento' => Camion::where('estado', 'mantenimiento')->count(),
                'baja' => Camion::where('estado', 'inactivo')->count(),
            ],
            'total_camiones' => Camion::count(),

            // Jornadas de hoy por estado
            'jornadas_hoy' => [
                'programada' => Jornada::whereDate('fecha', $hoy)->where('estado', 'programada')->count(),
                'en_curso' => Jornada::whereDate('fecha', $hoy)->where('estado', 'en_curso')->count(),
                'finalizada' => Jornada::whereDate('fecha', $hoy)->where('estado', 'finalizada')->count(),
                'cancelada' => Jornada::whereDate('fecha', $hoy)->where('estado', 'cancelada')->count(),
            ],
        ];
    }
}

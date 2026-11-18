<?php

namespace App\Services;

use App\Models\Jornada;
use Carbon\Carbon;

class MapaAdminService
{
    public function getUbicacionesEnTiempoReal(): array
    {
        // Busca jornadas activas hoy o en curso
        $jornadas = Jornada::with(['camion', 'operador', 'ruta'])
            ->where('estado', 'en_curso')
            ->get();

        $resultado = [];

        foreach ($jornadas as $jornada) {
            // Toma la última ubicación registrada (ajusta el nombre de la relación si es 'ubicaciones' o 'gpsLogs')
            $ultimaUbicacion = $jornada->ubicaciones()->latest('created_at')->first();

            if ($ultimaUbicacion) {
                $minutosSinSenal = Carbon::parse($ultimaUbicacion->created_at)->diffInMinutes(now());

                $resultado[] = [
                    'jornada_id' => $jornada->id,
                    'camion' => [
                        'id' => $jornada->camion->id ?? null,
                        'numero_economico' => $jornada->camion->numero_economico ?? 'Sin unidad',
                        'placa' => $jornada->camion->placa ?? ''
                    ],
                    'operador' => $jornada->operador->name ?? 'Sin operador',
                    'ruta' => $jornada->ruta->nombre ?? 'Sin ruta',
                    'ubicacion' => [
                        'lat' => (float) ($ultimaUbicacion->lat ?? $ultimaUbicacion->latitud),
                        'lng' => (float) ($ultimaUbicacion->lng ?? $ultimaUbicacion->longitud),
                        'estado_conexion' => $minutosSinSenal > 5 ? 'sin_senal' : 'conectado'
                    ]
                ];
            }
        }

        return $resultado;
    }
}
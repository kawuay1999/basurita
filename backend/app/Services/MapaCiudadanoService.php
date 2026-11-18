<?php

namespace App\Services;

use App\Models\Colonia;
use App\Models\Jornada;
use App\Models\Ubicacion;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

class MapaCiudadanoService
{
    public function getCamionesPorColonia(int $coloniaId): array
    {
        $colonia = Colonia::with('rutas')->find($coloniaId);
        
        if (!$colonia) {
            throw ValidationException::withMessages(['colonia' => 'Colonia no encontrada.']);
        }

        // Obtener los IDs de las rutas que pasan por esta colonia
        $rutasIds = $colonia->rutas->pluck('id')->toArray();

        // Buscar qué jornadas (asignaciones) están programadas o activas HOY para esas rutas
        $jornadas = Jornada::with('camion')
            ->whereIn('ruta_id', $rutasIds)
            ->whereDate('fecha', Carbon::today())
            ->whereIn('estado', ['programada', 'en_curso', 'finalizada'])
            ->get();

        $resultado = [];
        
        // Regla dura: Si no hay GPS en 5 mins, marcar como "sin_senal"
        $limiteSinSenal = Carbon::now()->subMinutes(5);

        foreach ($jornadas as $jornada) {
            $ultimaUbicacion = Ubicacion::where('jornada_id', $jornada->id)
                ->orderBy('fecha_hora_dispositivo', 'desc')
                ->first();

            $estadoConexion = 'sin_datos';

            if ($ultimaUbicacion && $jornada->estado === 'en_curso') {
                $estadoConexion = $ultimaUbicacion->fecha_hora_dispositivo->lt($limiteSinSenal) 
                    ? 'sin_senal' 
                    : 'conectado';
            }

            // Mapeo del estado interno al mensaje claro y no técnico para el ciudadano (RF-15)
            $estadoServicioTexto = match($jornada->estado) {
                'programada' => 'Aún no inicia ruta',
                'en_curso'   => 'En ruta',
                'finalizada' => 'Ruta finalizada',
                default      => 'Desconocido'
            };

            $resultado[] = [
                'jornada_id' => $jornada->id,
                'estado_servicio' => $estadoServicioTexto, // Mensaje amigable
                'camion' => 'Unidad ' . $jornada->camion->numero_economico, // Ocultamos placa y operador por privacidad
                'ubicacion' => $ultimaUbicacion ? [
                    'lat' => (float) $ultimaUbicacion->latitud,
                    'lng' => (float) $ultimaUbicacion->longitud,
                    'timestamp' => $ultimaUbicacion->fecha_hora_dispositivo->toIso8601String(),
                    'estado_conexion' => $estadoConexion
                ] : null
            ];
        }

        return $resultado;
    }
}
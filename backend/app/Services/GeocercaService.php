<?php

namespace App\Services;

use App\Models\User;
use App\Models\Jornada;
use App\Models\Notificacion;
use App\Models\NotificacionLog;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeocercaService
{
    /**
     * Evalúa qué ciudadanos están dentro de su radio de notificación
     * respecto a la ubicación actual del camión en la jornada activa.
     */
    public function evaluarProximidad(Jornada $jornada, float $latCamion, float $lngCamion): void
    {
        // Obtenemos las colonias asignadas a la ruta de esta jornada
        $coloniasIds = $jornada->ruta->colonias()->pluck('colonias.id');

        // Ciudadanos con casa registrada: de las colonias de la ruta o sin colonia
        // (los que se registran desde la app eligen su casa en el mapa y no tienen colonia).
        // El filtro real es la distancia, que se evalúa abajo.
        $ciudadanos = User::where('role', 'ciudadano')
            ->where(function ($q) use ($coloniasIds) {
                $q->whereIn('colonia_id', $coloniasIds)->orWhereNull('colonia_id');
            })
            ->whereNotNull('latitud_casa')
            ->whereNotNull('longitud_casa')
            ->get();

        foreach ($ciudadanos as $ciudadano) {
            // Verificamos si ya se le notificó en esta jornada para no saturarlo
            $yaNotificado = NotificacionLog::where('user_id', $ciudadano->id)
                ->where('jornada_id', $jornada->id)
                ->exists();

            if ($yaNotificado) {
                continue;
            }

            // Radio configurado por el usuario (por defecto 300 metros si es nulo)
            $radioMetros = $ciudadano->radio_notificacion_metros ?? 300;

            // Calculamos distancia en metros
            $distancia = $this->calcularDistanciaMetros(
                $latCamion,
                $lngCamion,
                (float) $ciudadano->latitud_casa,
                (float) $ciudadano->longitud_casa
            );

            if ($distancia <= $radioMetros) {
                $this->dispararAlertaProximidad($ciudadano, $jornada);
            }
        }
    }

    /**
     * Calcula la distancia entre dos puntos geográficos usando Haversine.
     */
    private function calcularDistanciaMetros(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $radioTierra = 6371000; // Radio de la Tierra en metros

        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $radioTierra * $c;
    }

    /**
     * Guarda la notificación en BD, registra el log y envía Push con reintentos.
     */
    private function dispararAlertaProximidad(User $ciudadano, Jornada $jornada): void
    {
        $titulo = 'Camión recolector cerca';
        $mensaje = 'El camión está a unos minutos de tu casa. ¡Saca tu basura!';

        // 1. Guardar en historial de notificaciones de la app
        Notificacion::create([
            'user_id' => $ciudadano->id,
            'titulo' => $titulo,
            'mensaje' => $mensaje,
            'leida' => false,
        ]);

        // 2. Registrar log para evitar duplicados en esta jornada
        NotificacionLog::create([
            'user_id' => $ciudadano->id,
            'jornada_id' => $jornada->id,
        ]);

        // 3. Notificación push al celular (Firebase). Si no está configurado, no pasa nada.
        app(FcmService::class)->enviarA($ciudadano, $titulo, $mensaje, ['tipo' => 'proximidad_camion']);
    }
}

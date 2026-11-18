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

        // Buscamos ciudadanos de esas colonias que tengan coordenadas registradas
        $ciudadanos = User::where('role', 'ciudadano')
            ->whereIn('colonia_id', $coloniasIds)
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
        $mensaje = 'El camión está cerca de tu colonia, saca tu basura';

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

        // 3. Enviar Push Notification con política de reintentos (ej. Firebase FCM)
        if (!empty($ciudadano->fcm_token)) {
            $this->enviarPushConReintentos($ciudadano->fcm_token, $titulo, $mensaje);
        }
    }

    /**
     * Envía la notificación push con hasta 3 reintentos en caso de fallo de red.
     */
    private function enviarPushConReintentos(string $token, string $titulo, string $mensaje): void
    {
        try {
            Http::retry(3, 500) // 3 intentos esperando 500ms entre cada uno
                ->withHeaders([
                    'Authorization' => 'key=' . config('services.fcm.server_key'),
                    'Content-Type' => 'application/json',
                ])
                ->post('https://fcm.googleapis.com/fcm/send', [
                    'to' => $token,
                    'notification' => [
                        'title' => $titulo,
                        'body' => $mensaje,
                        'sound' => 'default',
                    ],
                    'data' => [
                        'tipo' => 'proximidad_camion',
                        'vibrar' => true
                    ]
                ]);
        } catch (\Exception $e) {
            // Registramos el error silenciosamente sin detener el flujo GPS
            Log::warning("Fallo envío Push tras reintentos para token: {$token}. Error: " . $e->getMessage());
        }
    }
}
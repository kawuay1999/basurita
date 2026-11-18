<?php

namespace App\Services;

use App\Models\Notificacion;
use App\Models\NotificacionLog;
use App\Models\User;
use App\Models\Jornada;
use Illuminate\Support\Facades\Log;

class NotificacionService
{
    public function getHistorial(int $userId)
    {
        return Notificacion::where('user_id', $userId)->orderBy('created_at', 'desc')->get();
    }

    public function marcarComoLeida(int $notificacionId, int $userId): void
    {
        Notificacion::where('id', $notificacionId)->where('user_id', $userId)->update(['leida' => true]);
    }

    public function yaFueNotificadoHoy(int $userId, int $jornadaId): bool
    {
        return NotificacionLog::where('user_id', $userId)
            ->where('jornada_id', $jornadaId)
            ->exists();
    }

    public function enviarAlertaProximidad(User $ciudadano, Jornada $jornada): void
    {
        // 1. Marcar para no volver a enviarle hoy por este camión
        NotificacionLog::create([
            'user_id' => $ciudadano->id,
            'jornada_id' => $jornada->id,
        ]);

        // 2. Guardar en su historial
        Notificacion::create([
            'user_id' => $ciudadano->id,
            'titulo' => '¡El camión está cerca!',
            'mensaje' => 'La unidad ' . $jornada->camion->numero_economico . ' se está aproximando a tu zona. ¡Es hora de sacar la basura!',
        ]);

        // 3. (Futuro) Aquí se conectaría Firebase Cloud Messaging (FCM) o OneSignal
        // Log::info("Push Notification enviada a {$ciudadano->email}");
    }

    // Fórmula de Haversine para distancias en la Tierra (devuelve metros)
    public function calcularDistancia(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $radioTierra = 6371000; // Metros
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        
        $a = sin($dLat/2) * sin($dLat/2) +
             cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
             sin($dLon/2) * sin($dLon/2);
             
        $c = 2 * atan2(sqrt($a), sqrt(1-$a));
        
        return $radioTierra * $c;
    }
}
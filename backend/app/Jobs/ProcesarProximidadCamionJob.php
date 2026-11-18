<?php

namespace App\Jobs;

use App\Models\Jornada;
use App\Models\Ubicacion;
use App\Models\User;
use App\Services\NotificacionService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcesarProximidadCamionJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected Ubicacion $ubicacion;
    protected Jornada $jornada;

    public function __construct(Ubicacion $ubicacion)
    {
        $this->ubicacion = $ubicacion;
        $this->jornada = $ubicacion->jornada->load('ruta.colonias');
    }

    public function handle(NotificacionService $notificacionService): void
    {
        $coloniasIds = $this->jornada->ruta->colonias->pluck('id');

        // Buscar ciudadanos de esas colonias que tengan coordenadas configuradas
        $ciudadanos = User::where('role', 'ciudadano')
            ->whereIn('colonia_id', $coloniasIds)
            ->whereNotNull('latitud_casa')
            ->whereNotNull('longitud_casa')
            ->get();

        foreach ($ciudadanos as $ciudadano) {
            // Verificar que no se le haya notificado ya por este recorrido (Regla anti-duplicados)
            if ($notificacionService->yaFueNotificadoHoy($ciudadano->id, $this->jornada->id)) {
                continue;
            }

            // Calcular distancia en metros (Fórmula de Haversine)
            $distancia = $notificacionService->calcularDistancia(
                (float) $this->ubicacion->latitud, (float) $this->ubicacion->longitud,
                (float) $ciudadano->latitud_casa, (float) $ciudadano->longitud_casa
            );

            // Si entra en su radio, disparamos la alerta
            if ($distancia <= $ciudadano->radio_notificacion_metros) {
                $notificacionService->enviarAlertaProximidad($ciudadano, $this->jornada);
            }
        }
    }
}
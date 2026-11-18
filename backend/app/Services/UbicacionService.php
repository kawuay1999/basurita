<?php

namespace App\Services;

use App\Models\Jornada;
use App\Models\Ubicacion;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

class UbicacionService
{
    public function registrarUbicacion(int $operadorId, array $data): Ubicacion
    {
        // 1. Buscar la jornada activa del operador de hoy
        $jornada = Jornada::where('operador_id', $operadorId)
            ->whereDate('fecha', Carbon::today())
            ->where('estado', 'en_curso')
            ->first();

        // REGLA DURA: El GPS solo se recibe si la ruta está activa (en_curso)
        if (!$jornada) {
            throw ValidationException::withMessages([
                'jornada' => ['No tienes una ruta iniciada en este momento. La transmisión fue rechazada por privacidad.']
            ]);
        }

        // 2. Guardar la ubicación en el historial
        return Ubicacion::create([
            'jornada_id' => $jornada->id,
            'latitud' => $data['lat'],
            'longitud' => $data['lng'],
            'precision_metros' => $data['accuracy'] ?? null,
            'fecha_hora_dispositivo' => Carbon::parse($data['timestamp'])->setTimezone('UTC'),
        ]);

        // *Nota: En el Módulo 11 (Notificaciones) aquí despacharemos un Job para revisar
        // la proximidad de los ciudadanos respecto a esta nueva coordenada.*

        // 3. ¡NUEVO! Disparar el Job para checar quién está cerca (menos de 1 minuto)
        \App\Jobs\ProcesarProximidadCamionJob::dispatch($ubicacion);

        return $ubicacion;
    }
}
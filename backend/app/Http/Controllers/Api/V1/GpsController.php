<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Jornada;
use App\Models\Ubicacion;
use App\Services\GeocercaService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Carbon\Carbon;

class GpsController extends Controller
{
    protected GeocercaService $geocercaService;

    public function __construct(GeocercaService $geocercaService)
    {
        $this->geocercaService = $geocercaService;
    }

    /**
     * Recibe coordenadas del operador (soporta envíos individuales o en cola offline).
     */
    public function registrarUbicacion(Request $request)
    {
        $request->validate([
            'jornada_id' => 'required|exists:jornadas,id',
            'latitud' => 'required|numeric|between:-90,90',
            'longitud' => 'required|numeric|between:-180,180',
            'precision_metros' => 'nullable|numeric',
            'fecha_hora_dispositivo' => 'nullable|date'
        ]);

        $jornada = Jornada::where('id', $request->jornada_id)
            ->where('estado', 'en_curso')
            ->first();

        if (!$jornada) {
            return response()->json([
                'message' => 'La jornada no está activa.'
            ], 422);
        }

        // 1. Guardar en base de datos
        $ubicacion = Ubicacion::create([
            'jornada_id' => $jornada->id,
            'latitud' => $request->latitud,
            'longitud' => $request->longitud,
            'precision_metros' => $request->precision_metros ?? 10,
            'fecha_hora_dispositivo' => $request->fecha_hora_dispositivo ?? Carbon::now(),
        ]);

        // 2. Actualizar última ubicación conocida en Caché (TTL 24 horas)
        $cacheKey = "ultima_ubicacion_jornada_{$jornada->id}";
        Cache::put($cacheKey, [
            'lat' => (float) $ubicacion->latitud,
            'lng' => (float) $ubicacion->longitud,
            'actualizado_en' => Carbon::now()->toIso8601String(),
            'camion' => $jornada->camion->numero_economico ?? 'Unidad'
        ], now()->addHours(24));

        // 3. Evaluar geocercas de ciudadanos en esta ruta
        $this->geocercaService->evaluarProximidad(
            $jornada,
            (float) $ubicacion->latitud,
            (float) $ubicacion->longitud
        );

        return response()->json([
            'status' => 'ok',
            'message' => 'Ubicación procesada'
        ], 201);
    }

    /**
     * Devuelve la última ubicación conocida para el ciudadano.
     * Calcula hace cuántos minutos fue actualizada si se perdió la señal.
     */
    public function obtenerUbicacionPorColonia(int $coloniaId)
    {
        // Buscar jornada activa que cubra esta colonia
        $jornadaActiva = Jornada::where('estado', 'en_curso')
            ->whereHas('ruta.colonias', function ($query) use ($coloniaId) {
                $query->where('colonias.id', $coloniaId);
            })
            ->first();

        if (!$jornadaActiva) {
            return response()->json([
                'estado_ruta' => 'inactiva',
                'mensaje' => 'No hay camiones operando en tu colonia en este momento.'
            ]);
        }

        // Recuperar última ubicación conocida desde Caché o BD
        $cacheKey = "ultima_ubicacion_jornada_{$jornadaActiva->id}";
        $ultimaUbicacion = Cache::get($cacheKey);

        if (!$ultimaUbicacion) {
            $registroBd = Ubicacion::where('jornada_id', $jornadaActiva->id)
                ->latest('created_at')
                ->first();

            if (!$registroBd) {
                return response()->json([
                    'estado_ruta' => 'iniciando',
                    'mensaje' => 'El camión acaba de iniciar ruta, esperando señal...'
                ]);
            }

            $ultimaUbicacion = [
                'lat' => (float) $registroBd->latitud,
                'lng' => (float) $registroBd->longitud,
                'actualizado_en' => $registroBd->created_at->toIso8601String(),
            ];
        }

        // Calcular antigüedad de la señal para cumplir con RNF-23 / Módulo 2
        $fechaActualizacion = Carbon::parse($ultimaUbicacion['actualizado_en']);
        $minutosSinSenal = (int) $fechaActualizacion->diffInMinutes(Carbon::now());
        $senalPerdida = $minutosSinSenal >= 2; // Si pasan 2+ min sin reporte

        return response()->json([
            'estado_ruta' => 'activa',
            'lat' => $ultimaUbicacion['lat'],
            'lng' => $ultimaUbicacion['lng'],
            'senal_perdida' => $senalPerdida,
            'minutos_desde_actualizacion' => $minutosSinSenal,
            'mensaje_tiempo' => $senalPerdida
                ? "Última actualización: hace {$minutosSinSenal} min"
                : "En vivo"
        ]);
    }
}
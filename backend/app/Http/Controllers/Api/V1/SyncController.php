<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Incidencia;
use App\Models\Jornada;
use App\Models\Ubicacion;
use App\Services\GeocercaService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class SyncController extends Controller
{
    /**
     * Sincroniza lotes de ubicaciones GPS e incidencias acumuladas sin conexión.
     * Utiliza client_uuid para garantizar que nunca se dupliquen registros.
     */
    public function sincronizarOperador(Request $request, GeocercaService $geocercaService)
    {
        $request->validate([
            'ubicaciones' => 'nullable|array',
            'ubicaciones.*.client_uuid' => 'required|uuid',
            'ubicaciones.*.jornada_id' => 'required|exists:jornadas,id',
            'ubicaciones.*.latitud' => 'required|numeric|between:-90,90',
            'ubicaciones.*.longitud' => 'required|numeric|between:-180,180',
            'ubicaciones.*.fecha_hora_dispositivo' => 'required|date',

            'incidencias' => 'nullable|array',
            'incidencias.*.client_uuid' => 'required|uuid',
            'incidencias.*.jornada_id' => 'required|exists:jornadas,id',
            'incidencias.*.tipo' => 'required|in:calle_cerrada,falla_mecanica,accidente,camion_lleno,mal_clima,otro',
            'incidencias.*.descripcion' => 'nullable|string|max:500',
            'incidencias.*.fecha_hora_dispositivo' => 'required|date',
        ]);

        $procesados = [
            'ubicaciones' => 0,
            'incidencias' => 0,
        ];

        DB::transaction(function () use ($request, $geocercaService, &$procesados) {
            // 1. Procesar cola de ubicaciones GPS
            $ubicaciones = $request->input('ubicaciones', []);
            foreach ($ubicaciones as $item) {
                $ubicacion = Ubicacion::firstOrCreate(
                    ['client_uuid' => $item['client_uuid']],
                    [
                        'jornada_id' => $item['jornada_id'],
                        'latitud' => $item['latitud'],
                        'longitud' => $item['longitud'],
                        'precision_metros' => $item['precision_metros'] ?? 15,
                        'fecha_hora_dispositivo' => Carbon::parse($item['fecha_hora_dispositivo'])->setTimezone(config('app.timezone')),
                    ]
                );

                if ($ubicacion->wasRecentlyCreated) {
                    $procesados['ubicaciones']++;
                }
            }

            // Actualizar caché con la última ubicación cronológica si la jornada sigue activa
            if (!empty($ubicaciones)) {
                $ultima = end($ubicaciones);
                $jornada = Jornada::where('id', $ultima['jornada_id'])
                    ->where('estado', 'en_curso')
                    ->first();

                if ($jornada) {
                    Cache::put("ultima_ubicacion_jornada_{$jornada->id}", [
                        'lat' => (float) $ultima['latitud'],
                        'lng' => (float) $ultima['longitud'],
                        'actualizado_en' => Carbon::parse($ultima['fecha_hora_dispositivo'])->toIso8601String(),
                        'camion' => $jornada->camion->numero_economico ?? 'Unidad',
                    ], now()->addHours(24));

                    $geocercaService->evaluarProximidad(
                        $jornada,
                        (float) $ultima['latitud'],
                        (float) $ultima['longitud']
                    );
                }
            }

            // 2. Procesar cola de incidencias
            $incidencias = $request->input('incidencias', []);
            foreach ($incidencias as $inc) {
                $registro = Incidencia::firstOrCreate(
                    ['client_uuid' => $inc['client_uuid']],
                    [
                        'jornada_id' => $inc['jornada_id'],
                        'tipo' => $inc['tipo'],
                        'descripcion' => $inc['descripcion'] ?? 'Reporte sincronizado tras recuperar señal.',
                        'estado' => 'nueva',
                        'created_at' => Carbon::parse($inc['fecha_hora_dispositivo'])->setTimezone(config('app.timezone')),
                    ]
                );

                if ($registro->wasRecentlyCreated) {
                    $procesados['incidencias']++;
                }
            }
        });

        return response()->json([
            'exito' => true,
            'mensaje' => 'Datos sincronizados correctamente.',
            'sincronizados' => $procesados,
        ], 200);
    }
}
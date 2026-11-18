<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Jornada;
use App\Models\Incidencia;
use Carbon\Carbon;
use Illuminate\Http\Request;

class ReporteHistorialController extends Controller
{
    /**
     * Historial de atención por colonia para la App del Ciudadano (Hoy, Ayer, Esta semana).
     */
    public function historialCiudadano(int $coloniaId)
    {
        $inicioSemana = Carbon::now()->startOfWeek();
        $finSemana = Carbon::now()->endOfWeek();

        $jornadas = Jornada::with(['ruta', 'camion'])
            ->whereBetween('fecha', [$inicioSemana->toDateString(), $finSemana->toDateString()])
            ->whereHas('ruta.colonias', function ($q) use ($coloniaId) {
                $q->where('colonias.id', $coloniaId);
            })
            ->orderBy('fecha', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        $hoyStr = Carbon::today()->toDateString();
        $ayerStr = Carbon::yesterday()->toDateString();

        $resumen = [
            'hoy' => $this->formatearRegistroDia($jornadas->where('fecha', $hoyStr)->first(), 'Hoy'),
            'ayer' => $this->formatearRegistroDia($jornadas->where('fecha', $ayerStr)->first(), 'Ayer'),
            'semana' => $jornadas->map(function ($j) {
                return [
                    'id' => $j->id,
                    'fecha' => Carbon::parse($j->fecha)->format('d/m/Y'),
                    'dia_semana' => ucfirst(Carbon::parse($j->fecha)->locale('es')->dayName),
                    'ruta' => $j->ruta->nombre ?? 'Ruta asignada',
                    'unidad' => $j->camion->numero_economico ?? 'Unidad',
                    'estado' => $j->estado, // pendiente | en_curso | finalizada
                    'atendida' => $j->estado === 'finalizada',
                    'hora_actualizacion' => $j->updated_at->format('H:i')
                ];
            })->values()
        ];

        return response()->json([
            'exito' => true,
            'mensaje' => 'Historial de recolección consultado correctamente.',
            'data' => $resumen
        ], 200);
    }

    private function formatearRegistroDia(?Jornada $jornada, string $etiqueta): array
    {
        if (!$jornada) {
            return [
                'etiqueta' => $etiqueta,
                'atendida' => false,
                'estado' => 'sin_servicio',
                'descripcion' => 'Sin recorrido registrado en esta fecha.',
                'hora' => null,
                'unidad' => null
            ];
        }

        $mensajes = [
            'finalizada' => 'Colonia atendida correctamente.',
            'en_curso'   => 'Camión realizando recorrido actualmente.',
            'pendiente'  => 'Recorrido programado pendiente de iniciar.'
        ];

        return [
            'etiqueta' => $etiqueta,
            'atendida' => $jornada->estado === 'finalizada',
            'estado' => $jornada->estado,
            'descripcion' => $mensajes[$jornada->estado] ?? 'Estado en revisión.',
            'hora' => $jornada->updated_at->format('H:i'),
            'unidad' => $jornada->camion->numero_economico ?? null
        ];
    }

    /**
     * Reporte operativo para el Panel Admin Web (filtrable por ruta, camión, colonia y fechas).
     */
    public function reporteAdmin(Request $request)
    {
        $query = Jornada::with(['ruta.colonias', 'ruta.horarios', 'camion', 'incidencias'])
            ->orderBy('fecha', 'desc');

        if ($request->filled('fecha_inicio')) {
            $query->whereDate('fecha', '>=', $request->fecha_inicio);
        }

        if ($request->filled('fecha_fin')) {
            $query->whereDate('fecha', '<=', $request->fecha_fin);
        }

        if ($request->filled('ruta_id')) {
            $query->where('ruta_id', $request->ruta_id);
        }

        if ($request->filled('camion_id')) {
            $query->where('camion_id', $request->camion_id);
        }

        if ($request->filled('colonia_id')) {
            $coloniaId = $request->colonia_id;
            $query->whereHas('ruta.colonias', function ($q) use ($coloniaId) {
                $q->where('colonias.id', $coloniaId);
            });
        }

        $jornadas = $query->get();

        $registros = $jornadas->map(function ($j) {
            // Detectar retraso real comparando inicio de jornada vs horario programado del día
            $tuvoRetraso = false;
            $minutosRetraso = 0;
            $diaSemana = strtolower(Carbon::parse($j->fecha)->locale('es')->dayName);
            $horarioProgramado = $j->ruta?->horarios?->firstWhere('dia_semana', $diaSemana);

            if ($horarioProgramado && $horarioProgramado->hora_inicio) {
                $horaEsperada = Carbon::parse($j->fecha . ' ' . $horarioProgramado->hora_inicio);
                $horaRealInicio = Carbon::parse($j->created_at);
                if ($horaRealInicio->greaterThan($horaEsperada->copy()->addMinutes(15))) {
                    $tuvoRetraso = true;
                    $minutosRetraso = (int) $horaEsperada->diffInMinutes($horaRealInicio);
                }
            }

            return [
                'id' => $j->id,
                'fecha' => Carbon::parse($j->fecha)->format('Y-m-d'),
                'ruta' => $j->ruta->nombre ?? 'Sin ruta',
                'camion' => $j->camion->numero_economico ?? 'Sin unidad',
                'placa' => $j->camion->placa ?? '',
                'colonias' => $j->ruta?->colonias?->pluck('nombre')->implode(', ') ?: 'Sin colonias',
                'estado' => $j->estado,
                'completada' => $j->estado === 'finalizada',
                'total_incidencias' => $j->incidencias->count(),
                'tuvo_retraso' => $tuvoRetraso,
                'minutos_retraso' => $minutosRetraso
            ];
        });

        // Totales reales calculados desde los registros de BD
        $totales = [
            'rutas_completadas' => $registros->where('completada', true)->count(),
            'total_jornadas' => $registros->count(),
            'total_incidencias' => $registros->sum('total_incidencias'),
            'total_retrasos' => $registros->where('tuvo_retraso', true)->count(),
        ];

        return response()->json([
            'exito' => true,
            'mensaje' => 'Reporte generado correctamente.',
            'totales' => $totales,
            'registros' => $registros->values()
        ], 200);
    }
}
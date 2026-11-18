<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Colonia;
use App\Models\Jornada;
use App\Services\GeocercaService;
use Illuminate\Http\Request;

class RutaColoniaController extends Controller
{
    /**
     * Obtener el estado de la ruta para una colonia (Tarjeta de estado ciudadano).
     */
    public function estadoPorColonia(int $coloniaId)
    {
        $colonia = Colonia::find($coloniaId);

        if (!$colonia) {
            return response()->json([
                'exito' => false,
                'mensaje' => 'La colonia seleccionada no existe.'
            ], 404);
        }

        // Buscar jornada de hoy para las rutas asociadas a esta colonia
        $jornada = Jornada::with(['ruta', 'camion'])
            ->whereDate('fecha', today())
            ->whereHas('ruta.colonias', function ($q) use ($coloniaId) {
                $q->where('colonias.id', $coloniaId);
            })
            ->latest('id')
            ->first();

        if (!$jornada) {
            return response()->json([
                'exito' => true,
                'estado' => 'pending', // Aún no inicia
                'etiqueta' => 'Aún no inicia',
                'mensaje' => 'El camión recolector aún no inicia su recorrido en tu colonia.',
                'colonia' => $colonia->nombre
            ], 200);
        }

        $mapaEstados = [
            'pendiente' => ['estado' => 'pending', 'etiqueta' => 'Aún no inicia', 'mensaje' => 'El camión iniciará pronto su recorrido.'],
            'en_curso'  => ['estado' => 'active', 'etiqueta' => 'En ruta ahora', 'mensaje' => 'El camión recolector está operando en tu zona.'],
            'finalizada'=> ['estado' => 'finished', 'etiqueta' => 'Ruta finalizada', 'mensaje' => 'El servicio de recolección de hoy ha concluido.']
        ];

        $info = $mapaEstados[$jornada->estado] ?? $mapaEstados['pendiente'];

        return response()->json([
            'exito' => true,
            'estado' => $info['estado'],
            'etiqueta' => $info['etiqueta'],
            'mensaje' => $info['mensaje'],
            'colonia' => $colonia->nombre,
            'unidad' => $jornada->camion->numero_economico ?? null
        ], 200);
    }

    /**
     * Evaluar y enviar notificaciones push de proximidad para una jornada.
     */
    public function enviarPushProximidad(Request $request, GeocercaService $geocercaService)
    {
        $request->validate([
            'jornada_id' => 'required|exists:jornadas,id',
            'latitud' => 'required|numeric|between:-90,90',
            'longitud' => 'required|numeric|between:-180,180'
        ]);

        $jornada = Jornada::where('id', $request->jornada_id)
            ->where('estado', 'en_curso')
            ->first();

        if (!$jornada) {
            return response()->json([
                'exito' => false,
                'mensaje' => 'No hay una ruta activa para enviar notificaciones.'
            ], 422);
        }

        $geocercaService->evaluarProximidad(
            $jornada,
            (float) $request->latitud,
            (float) $request->longitud
        );

        return response()->json([
            'exito' => true,
            'mensaje' => 'Alertas de proximidad procesadas correctamente.'
        ], 200);
    }
}
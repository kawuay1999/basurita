<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Incidencia;
use App\Services\IncidenciaService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;
use App\Models\Jornada;

class IncidenciaController extends Controller
{
    protected IncidenciaService $incidenciaService;

    public function __construct(IncidenciaService $incidenciaService)
    {
        $this->incidenciaService = $incidenciaService;
    }

    // ==========================================
    // MÉTODOS PARA EL ADMINISTRADOR
    // ==========================================
    public function index(Request $request)
    {
        $query = Incidencia::with(['jornada.camion', 'jornada.ruta', 'jornada.operador'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('estado') && $request->estado !== 'todas') {
            $query->where('estado', $request->estado);
        }

        if ($request->filled('buscar')) {
            $termino = $request->buscar;
            $query->whereHas('jornada.camion', function ($q) use ($termino) {
                $q->where('numero_economico', 'ILIKE', "%{$termino}%");
            })->orWhereHas('jornada.ruta', function ($q) use ($termino) {
                $q->where('nombre', 'ILIKE', "%{$termino}%");
            });
        }

        $incidencias = $query->get()->map(function ($inc) {
            return [
                'id' => $inc->id,
                'tipo' => $inc->tipo,
                'descripcion' => $inc->descripcion,
                'estado' => $inc->estado,
                'foto_url' => $inc->foto_path ? asset('storage/' . $inc->foto_path) : null,
                'created_at' => $inc->created_at->toIso8601String(),
                'camion' => [
                    'numero_economico' => $inc->jornada->camion->numero_economico ?? 'Sin asignar',
                    'placa' => $inc->jornada->camion->placa ?? ''
                ],
                'ruta' => [
                    'nombre' => $inc->jornada->ruta->nombre ?? 'Sin ruta'
                ]
            ];
        });

        return response()->json([
            'exito' => true,
            'mensaje' => 'Incidencias consultadas correctamente.',
            'data' => $incidencias
        ], 200);
    }
    
    public function updateEstado(Request $request, Incidencia $incidencia): JsonResponse
    {
        $validated = $request->validate([
            'estado' => ['required', Rule::in(['nueva', 'en_atencion', 'resuelta'])]
        ]);

        $updatedIncidencia = $this->incidenciaService->actualizarEstado($incidencia, $validated['estado']);

        return response()->json([
            'status' => 'success',
            'message' => 'Estado de la incidencia actualizado.',
            'data' => $updatedIncidencia
        ]);
    }

    // ==========================================
    // MÉTODOS PARA EL OPERADOR
    // ==========================================
    public function store(Request $request)
    {
        $request->validate([
            'tipo' => 'required|in:calle_cerrada,falla_mecanica,accidente,camion_lleno,mal_clima,otro',
            'descripcion' => 'nullable|string|max:500',
            'foto' => 'nullable|image|max:5120', // Opcional, máx 5MB
            'jornada_id' => 'nullable|exists:jornadas,id'
        ]);

        // Buscar jornada activa del operador autenticado si no se envía explícita
        $jornadaId = $request->jornada_id;
        if (!$jornadaId) {
            $jornadaActiva = Jornada::where('operador_id', $request->user()->id)
                ->where('estado', 'en_curso')
                ->first();

            if (!$jornadaActiva) {
                return response()->json([
                    'exito' => false,
                    'mensaje' => 'Debes iniciar tu ruta antes de reportar una incidencia.'
                ], 422);
            }
            $jornadaId = $jornadaActiva->id;
        }

        $fotoPath = null;
        if ($request->hasFile('foto')) {
            $fotoPath = $request->file('foto')->store('incidencias', 'public');
        }

        $incidencia = Incidencia::create([
            'jornada_id' => $jornadaId,
            'tipo' => $request->tipo,
            'descripcion' => $request->descripcion ?? 'Reporte rápido desde unidad en ruta.',
            'foto_path' => $fotoPath,
            'estado' => 'nueva'
        ]);

        return response()->json([
            'exito' => true,
            'mensaje' => 'Reporte de incidencia enviado correctamente.',
            'data' => $incidencia
        ], 201);
    }
}
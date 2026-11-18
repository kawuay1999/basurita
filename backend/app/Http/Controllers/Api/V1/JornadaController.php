<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Jornada;
use App\Services\JornadaService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;

class JornadaController extends Controller
{
    protected JornadaService $jornadaService;

    public function __construct(JornadaService $jornadaService)
    {
        $this->jornadaService = $jornadaService;
    }

    // ==========================================
    // MÉTODOS PARA EL ADMINISTRADOR
    // ==========================================

    public function index(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => $this->jornadaService->getAllJornadas()
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'operador_id' => 'required|integer|exists:users,id',
            'camion_id' => 'required|integer|exists:camiones,id',
            'ruta_id' => 'required|integer|exists:rutas,id',
            'fecha' => 'required|date',
            'estado' => ['nullable', Rule::in(['programada', 'en_curso', 'finalizada', 'cancelada'])],
        ]);

        $jornada = $this->jornadaService->createJornada($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Jornada asignada correctamente.',
            'data' => $jornada
        ], 201);
    }

    public function update(Request $request, Jornada $jornada): JsonResponse
    {
        $validated = $request->validate([
            'operador_id' => 'sometimes|required|integer|exists:users,id',
            'camion_id' => 'sometimes|required|integer|exists:camiones,id',
            'ruta_id' => 'sometimes|required|integer|exists:rutas,id',
            'fecha' => 'sometimes|required|date',
            'estado' => ['sometimes', 'required', Rule::in(['programada', 'en_curso', 'finalizada', 'cancelada'])],
        ]);

        $updatedJornada = $this->jornadaService->updateJornada($jornada, $validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Jornada actualizada correctamente.',
            'data' => $updatedJornada
        ]);
    }

    public function destroy(Jornada $jornada): JsonResponse
    {
        $this->jornadaService->deleteJornada($jornada);
        
        return response()->json([
            'status' => 'success',
            'message' => 'Jornada eliminada correctamente.'
        ]);
    }

    // ==========================================
    // MÉTODOS PARA EL OPERADOR
    // ==========================================

    public function miJornadaHoy(Request $request): JsonResponse
    {
        $jornada = $this->jornadaService->getJornadaDeHoy($request->user()->id);

        if (!$jornada) {
            return response()->json([
                'status' => 'success',
                'message' => 'No tienes ninguna ruta asignada para el día de hoy.',
                'data' => null
            ]);
        }

        return response()->json([
            'status' => 'success',
            'data' => $jornada
        ]);
    }

    public function iniciarRuta(Request $request): JsonResponse
    {
        $jornada = $this->jornadaService->getJornadaDeHoy($request->user()->id);
        
        if (!$jornada || $jornada->estado !== 'programada') {
            return response()->json([
                'status' => 'error', 
                'message' => 'No tienes una jornada programada para iniciar.'
            ], 400);
        }

        $jornada->update(['estado' => 'en_curso']);

        return response()->json([
            'status' => 'success', 
            'message' => 'Ruta iniciada. La transmisión GPS ha comenzado.'
        ]);
    }

    public function finalizarRuta(Request $request): JsonResponse
    {
        $jornada = $this->jornadaService->getJornadaDeHoy($request->user()->id);
        
        if (!$jornada || $jornada->estado !== 'en_curso') {
            return response()->json([
                'status' => 'error', 
                'message' => 'No tienes una ruta en curso para finalizar.'
            ], 400);
        }

        $jornada->update(['estado' => 'finalizada']);

        return response()->json([
            'status' => 'success', 
            'message' => 'Ruta finalizada. La transmisión GPS se ha detenido por tu privacidad.'
        ]);
    }
}
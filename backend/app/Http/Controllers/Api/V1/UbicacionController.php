<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\UbicacionService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class UbicacionController extends Controller
{
    protected UbicacionService $ubicacionService;

    public function __construct(UbicacionService $ubicacionService)
    {
        $this->ubicacionService = $ubicacionService;
    }

    public function store(Request $request): JsonResponse
    {
        // REGLA DURA: Validar que el GPS sea coherente
        $validated = $request->validate([
            'lat' => 'required|numeric|between:-90,90',
            'lng' => 'required|numeric|between:-180,180',
            'timestamp' => 'required|date',
            'accuracy' => 'nullable|numeric'
        ]);

        try {
            $this->ubicacionService->registrarUbicacion($request->user()->id, $validated);
            
            return response()->json([
                'status' => 'success',
                'message' => 'Ubicación recibida.'
            ]); // Respuesta muy corta para ahorrar datos móviles
            
        } catch (\Illuminate\Validation\ValidationException $e) {
            // Devolvemos 403 si intentan mandar GPS sin jornada activa
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 403);
        }
    }
}
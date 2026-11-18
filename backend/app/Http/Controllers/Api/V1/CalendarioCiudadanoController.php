<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\CalendarioCiudadanoService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CalendarioCiudadanoController extends Controller
{
    protected CalendarioCiudadanoService $calendarioService;

    public function __construct(CalendarioCiudadanoService $calendarioService)
    {
        $this->calendarioService = $calendarioService;
    }

    public function horarios(Request $request, int $coloniaId): JsonResponse
    {
        try {
            $horarios = $this->calendarioService->getHorariosHabituales($coloniaId);
            return response()->json([
                'status' => 'success',
                'data' => $horarios
            ]);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 404);
        }
    }

    public function calendario(Request $request, int $coloniaId): JsonResponse
    {
        $validated = $request->validate([
            'year' => 'required|integer|min:2024',
            'month' => 'required|integer|between:1,12',
        ]);

        try {
            $calendario = $this->calendarioService->generarCalendarioMensual(
                $coloniaId, 
                $validated['year'], 
                $validated['month']
            );

            return response()->json([
                'status' => 'success',
                'data' => $calendario
            ]);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 404);
        }
    }
}
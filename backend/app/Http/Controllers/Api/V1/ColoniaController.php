<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Colonia;
use App\Services\ColoniaService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ColoniaController extends Controller
{
    protected ColoniaService $coloniaService;

    public function __construct(ColoniaService $coloniaService)
    {
        $this->coloniaService = $coloniaService;
    }

    // Público o logueado (Ciudadanos)
    public function activas(): JsonResponse
    {
        $colonias = $this->coloniaService->getActiveColonias();
        return response()->json([
            'status' => 'success',
            'data' => $colonias
        ]);
    }

    // Admin: Listar todas
    public function index(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => $this->coloniaService->getAllColonias()
        ]);
    }

    // Admin: Crear
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:255',
            'zona_o_sector' => 'nullable|string|max:100',
            'codigo_postal' => 'nullable|string|max:10',
            'activa' => 'boolean',
        ]);

        $colonia = $this->coloniaService->createColonia($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Colonia registrada correctamente.',
            'data' => $colonia
        ], 201);
    }

    // Admin: Actualizar
    public function update(Request $request, Colonia $colonia): JsonResponse
    {
        $validated = $request->validate([
            'nombre' => 'sometimes|required|string|max:255',
            'zona_o_sector' => 'nullable|string|max:100',
            'codigo_postal' => 'nullable|string|max:10',
            'activa' => 'boolean',
        ]);

        $updatedColonia = $this->coloniaService->updateColonia($colonia, $validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Colonia actualizada correctamente.',
            'data' => $updatedColonia
        ]);
    }

    // Admin: Eliminar
    public function destroy(Colonia $colonia): JsonResponse
    {
        try {
            $this->coloniaService->deleteColonia($colonia);
            return response()->json([
                'status' => 'success',
                'message' => 'Colonia eliminada.'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 400);
        }
    }
}
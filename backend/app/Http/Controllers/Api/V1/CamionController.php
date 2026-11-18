<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Camion;
use App\Services\CamionService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;

class CamionController extends Controller
{
    protected CamionService $camionService;

    public function __construct(CamionService $camionService)
    {
        $this->camionService = $camionService;
    }

    // Listar todos (Para el panel Admin)
    public function index(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => $this->camionService->getAllCamiones()
        ]);
    }

    // Listar solo activos (Útil para dropdowns al asignar rutas)
    public function activos(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => $this->camionService->getActiveCamiones()
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'numero_economico' => 'required|string|max:50|unique:camiones,numero_economico',
            'placa' => 'required|string|max:20|unique:camiones,placa',
            'capacidad_toneladas' => 'nullable|numeric|min:0',
            'estado' => ['nullable', Rule::in(['activo', 'mantenimiento', 'inactivo'])],
        ]);

        $camion = $this->camionService->createCamion($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Camión registrado correctamente.',
            'data' => $camion
        ], 201);
    }

    public function update(Request $request, Camion $camion): JsonResponse
    {
        $validated = $request->validate([
            'numero_economico' => ['sometimes', 'required', 'string', 'max:50', Rule::unique('camiones')->ignore($camion->id)],
            'placa' => ['sometimes', 'required', 'string', 'max:20', Rule::unique('camiones')->ignore($camion->id)],
            'capacidad_toneladas' => 'nullable|numeric|min:0',
            'estado' => ['sometimes', 'required', Rule::in(['activo', 'mantenimiento', 'inactivo'])],
        ]);

        $updatedCamion = $this->camionService->updateCamion($camion, $validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Camión actualizado correctamente.',
            'data' => $updatedCamion
        ]);
    }

    public function destroy(Camion $camion): JsonResponse
    {
        $this->camionService->deleteCamion($camion);
        return response()->json([
            'status' => 'success',
            'message' => 'Camión eliminado correctamente.'
        ]);
    }
}
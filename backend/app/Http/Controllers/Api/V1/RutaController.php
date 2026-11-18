<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Ruta;
use App\Services\RutaService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;

class RutaController extends Controller
{
    protected RutaService $rutaService;

    public function __construct(RutaService $rutaService)
    {
        $this->rutaService = $rutaService;
    }

    public function index(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => $this->rutaService->getAllRutas()
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:255|unique:rutas,nombre',
            'descripcion' => 'nullable|string',
            'activa' => 'boolean',
            'colonias' => 'required|array|min:1',
            'colonias.*' => 'integer|exists:colonias,id', // Valida que los IDs existan
            'horarios' => 'required|array|min:1',
            'horarios.*.dia_semana' => ['required', Rule::in(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'])],
            'horarios.*.hora_inicio' => 'required|date_format:H:i',
            'horarios.*.hora_fin' => 'required|date_format:H:i|after:horarios.*.hora_inicio', // La hora de fin debe ser después de la de inicio
        ]);

        $ruta = $this->rutaService->createRuta($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Ruta creada con sus colonias y horarios correctamente.',
            'data' => $ruta
        ], 201);
    }

    public function update(Request $request, Ruta $ruta): JsonResponse
    {
        $validated = $request->validate([
            'nombre' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('rutas')->ignore($ruta->id)],
            'descripcion' => 'nullable|string',
            'activa' => 'boolean',
            'colonias' => 'sometimes|array|min:1',
            'colonias.*' => 'integer|exists:colonias,id',
            'horarios' => 'sometimes|array|min:1',
            'horarios.*.dia_semana' => ['required', Rule::in(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'])],
            'horarios.*.hora_inicio' => 'required|date_format:H:i',
            'horarios.*.hora_fin' => 'required|date_format:H:i|after:horarios.*.hora_inicio',
        ]);

        $updatedRuta = $this->rutaService->updateRuta($ruta, $validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Ruta actualizada correctamente.',
            'data' => $updatedRuta
        ]);
    }

    public function destroy(Ruta $ruta): JsonResponse
    {
        $this->rutaService->deleteRuta($ruta);
        return response()->json([
            'status' => 'success',
            'message' => 'Ruta eliminada correctamente.'
        ]);
    }
}
<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Aviso;
use App\Services\AvisoService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AvisoController extends Controller
{
    protected AvisoService $avisoService;

    public function __construct(AvisoService $avisoService) {
        $this->avisoService = $avisoService;
    }

    // [CIUDADANO]
    public function publicos(): JsonResponse
    {
        return response()->json(['status' => 'success', 'data' => $this->avisoService->getAvisosPublicos()]);
    }

    // [ADMIN]
    public function index(): JsonResponse
    {
        return response()->json(['status' => 'success', 'data' => $this->avisoService->getAllAvisos()]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'titulo' => 'required|string|max:255',
            'mensaje' => 'required|string',
            'activo' => 'boolean',
            'fecha_expiracion' => 'nullable|date|after:today',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Aviso publicado correctamente.',
            'data' => $this->avisoService->createAviso($validated)
        ], 201);
    }

    public function update(Request $request, Aviso $aviso): JsonResponse
    {
        $validated = $request->validate([
            'titulo' => 'sometimes|required|string|max:255',
            'mensaje' => 'sometimes|required|string',
            'activo' => 'boolean',
            'fecha_expiracion' => 'nullable|date',
        ]);

        return response()->json([
            'status' => 'success',
            'data' => $this->avisoService->updateAviso($aviso, $validated)
        ]);
    }

    public function destroy(Aviso $aviso): JsonResponse
    {
        $this->avisoService->deleteAviso($aviso);
        return response()->json(['status' => 'success', 'message' => 'Aviso eliminado.']);
    }
}
<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\MapaCiudadanoService;
use Illuminate\Http\JsonResponse;

class MapaCiudadanoController extends Controller
{
    protected MapaCiudadanoService $mapaCiudadanoService;

    public function __construct(MapaCiudadanoService $mapaCiudadanoService)
    {
        $this->mapaCiudadanoService = $mapaCiudadanoService;
    }

    public function getUbicaciones(int $coloniaId): JsonResponse
    {
        try {
            $datosMapa = $this->mapaCiudadanoService->getCamionesPorColonia($coloniaId);

            return response()->json([
                'status' => 'success',
                'data' => $datosMapa
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 404);
        }
    }
}
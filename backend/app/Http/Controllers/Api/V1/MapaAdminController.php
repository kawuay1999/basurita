<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\MapaAdminService;
use Illuminate\Http\JsonResponse;

class MapaAdminController extends Controller
{
    protected MapaAdminService $mapaAdminService;

    public function __construct(MapaAdminService $mapaAdminService)
    {
        $this->mapaAdminService = $mapaAdminService;
    }

    public function getUbicaciones(): JsonResponse
    {
        $datosMapa = $this->mapaAdminService->getUbicacionesEnTiempoReal();

        return response()->json([
            'status' => 'success',
            'data' => $datosMapa
        ]);
    }
}
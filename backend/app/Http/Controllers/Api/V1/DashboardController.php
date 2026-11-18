<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    protected DashboardService $dashboardService;

    public function __construct(DashboardService $dashboardService) {
        $this->dashboardService = $dashboardService;
    }

    public function index(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => $this->dashboardService->getEstadisticasDelDia()
        ]);
    }
}
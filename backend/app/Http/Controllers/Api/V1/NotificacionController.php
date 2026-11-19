<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\NotificacionService;
use Illuminate\Http\Request;

class NotificacionController extends Controller
{
    protected NotificacionService $notificacionService;

    public function __construct(NotificacionService $notificacionService) {
        $this->notificacionService = $notificacionService;
    }

    public function index(Request $request) {
        return response()->json([
            'status' => 'success',
            'data' => $this->notificacionService->getHistorial($request->user()->id)
        ]);
    }

    public function marcarLeida(Request $request, int $id) {
        $this->notificacionService->marcarComoLeida($id, $request->user()->id);
        return response()->json(['status' => 'success', 'message' => 'Notificación leída.']);
    }

    // Guarda el token del dispositivo para notificaciones push
    public function registrarFcmToken(Request $request) {
        $validated = $request->validate([
            'fcm_token' => 'required|string|max:255',
        ]);

        $request->user()->update(['fcm_token' => $validated['fcm_token']]);

        return response()->json(['status' => 'success', 'message' => 'Token de notificaciones registrado.']);
    }
}
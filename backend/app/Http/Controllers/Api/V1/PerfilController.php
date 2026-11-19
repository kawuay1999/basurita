<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * "Mis datos" para cualquier usuario con sesión (ciudadano, conductor o admin).
 */
class PerfilController extends Controller
{
    public function mostrar(Request $request): JsonResponse
    {
        return response()->json(['data' => self::datos($request->user())]);
    }

    public function actualizar(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|min:3|max:255',
            'phone' => 'nullable|string|max:20',
        ]);

        $user = $request->user();
        $user->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Tus datos se actualizaron correctamente.',
            'data' => self::datos($user->fresh()),
        ]);
    }

    public static function datos($user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone ?? $user->telefono,
            'role' => $user->role,
            'latitud_casa' => $user->latitud_casa !== null ? (float) $user->latitud_casa : null,
            'longitud_casa' => $user->longitud_casa !== null ? (float) $user->longitud_casa : null,
            'direccion_casa' => $user->direccion_casa,
            'radio_notificacion_metros' => $user->radio_notificacion_metros,
        ];
    }
}

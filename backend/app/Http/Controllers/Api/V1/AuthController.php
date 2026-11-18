<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\AuthService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    protected AuthService $authService;

    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }

    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'phone' => 'nullable|string|max:20',
            'password' => 'required|string|min:8',
            'colonia_id' => 'nullable|integer|exists:colonias,id',
        ]);

        $user = $this->authService->registerCitizen($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Registro exitoso. Ya puede iniciar sesión.',
            'data' => $user
        ], 201);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string'
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'exito' => false,
                'mensaje' => 'Correo o contraseña incorrectos. Por favor, intenta de nuevo.'
            ], 401);
        }

        // Generar token de acceso Sanctum
        $token = $user->createToken('basurita_token')->plainTextToken;

        return response()->json([
            'exito' => true,
            'mensaje' => 'Inicio de sesión exitoso.',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'colonia_id' => $user->colonia_id
            ]
        ], 200);
    }

    public function logout(Request $request): JsonResponse
    {
        $this->authService->logout($request->user());

        return response()->json([
            'status' => 'success',
            'message' => 'Sesión cerrada correctamente.'
        ]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|string|email',
        ]);

        $message = $this->authService->generateRecoveryCode($validated['email']);

        return response()->json([
            'status' => 'success',
            'message' => $message
        ]);
    }
    
}
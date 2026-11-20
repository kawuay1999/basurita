<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\AuthService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    protected AuthService $authService;

    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }

    public function register(Request $request): JsonResponse
    {
        // Se limpia antes de validar: correo en minúsculas y sin espacios, teléfono solo con números
        $request->merge([
            'name' => trim(preg_replace('/\s+/', ' ', (string) $request->input('name'))),
            'email' => strtolower(trim((string) $request->input('email'))),
            'phone' => preg_replace('/\D/', '', (string) $request->input('phone')),
        ]);

        // Mismas reglas que la app (por si alguien llama a la API directamente)
        $validated = $request->validate([
            'name' => ['required', 'string', 'min:3', 'max:80', "regex:/^[\\pL' .-]+$/u"],
            'email' => ['required', 'string', 'max:120', 'email:rfc', 'regex:/^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/', 'unique:users,email'],
            'phone' => ['required', 'digits:10'],
            'password' => ['required', 'string', Password::min(8)->mixedCase()->numbers()],
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
        $request->merge(['email' => strtolower(trim((string) $request->input('email')))]);
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string'
        ]);

        // El correo se compara sin importar mayúsculas ni espacios (el teclado del celular los agrega)
        $email = strtolower(trim((string) $request->email));
        $user = User::whereRaw('LOWER(email) = ?', [$email])->first();

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
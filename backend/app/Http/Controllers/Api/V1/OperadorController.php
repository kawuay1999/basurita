<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\OperadorService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;

class OperadorController extends Controller
{
    protected OperadorService $operadorService;

    public function __construct(OperadorService $operadorService)
    {
        $this->operadorService = $operadorService;
    }

    public function index(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => $this->operadorService->getAllOperadores()
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'phone' => 'required|string|max:20', // El teléfono es crucial para contactar al operador
            'password' => 'required|string|min:8',
        ]);

        $operador = $this->operadorService->createOperador($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Operador registrado correctamente.',
            'data' => $operador
        ], 201);
    }

    public function update(Request $request, User $operador): JsonResponse
    {
        // Validar que el usuario que intentan editar realmente sea un operador
        if ($operador->role !== 'operador') {
            return response()->json([
                'status' => 'error',
                'message' => 'El usuario especificado no es un operador.'
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => ['sometimes', 'required', 'string', 'email', 'max:255', Rule::unique('users')->ignore($operador->id)],
            'phone' => 'sometimes|required|string|max:20',
            'password' => 'nullable|string|min:8',
        ]);

        $updatedOperador = $this->operadorService->updateOperador($operador, $validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Operador actualizado correctamente.',
            'data' => $updatedOperador
        ]);
    }

    public function destroy(User $operador): JsonResponse
    {
        if ($operador->role !== 'operador') {
            return response()->json([
                'status' => 'error',
                'message' => 'Solo se pueden eliminar cuentas de operadores desde este módulo.'
            ], 403);
        }

        $this->operadorService->deleteOperador($operador);

        return response()->json([
            'status' => 'success',
            'message' => 'Operador eliminado correctamente.'
        ]);
    }
}